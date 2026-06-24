export interface GmailEmail {
  id: string;
  subject: string;
  from: string;
  fromName: string;
  fromEmail: string;
  snippet: string;
  body?: string;
  date: string;
  needsReply: boolean;
  category: string;
}

function getGmailMessageBody(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data) {
    try {
      return Buffer.from(payload.body.data, "base64").toString("utf-8");
    } catch (e) {
      return "";
    }
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        try {
          return Buffer.from(part.body.data, "base64").toString("utf-8");
        } catch (e) {}
      }
    }
    for (const part of payload.parts) {
      if (part.parts) {
        const deepBody = getGmailMessageBody(part);
        if (deepBody) return deepBody;
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        try {
          return Buffer.from(part.body.data, "base64").toString("utf-8");
        } catch (e) {}
      }
    }
  }
  return "";
}

// Fetch helper with AbortController timeout to prevent hangs
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchGmailEmailById(accessToken: string, emailId: string, type: "inbox" | "sent" = "inbox"): Promise<GmailEmail | null> {
  try {
    const detailRes = await fetchWithTimeout(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
      3000
    );

    if (!detailRes.ok) return null;

    const detail = await detailRes.json();
    const headers = detail.payload?.headers || [];
    
    const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === "subject");
    const participantHeader = headers.find((h: any) => h.name.toLowerCase() === (type === "sent" ? "to" : "from"));
    const dateHeader = headers.find((h: any) => h.name.toLowerCase() === "date");

    const subject = subjectHeader ? subjectHeader.value : "No Subject";
    const fromStr = participantHeader ? participantHeader.value : "Unknown";
    
    let fromName = fromStr;
    let fromEmail = "";
    const match = fromStr.match(/(.*)<(.*)>/);
    if (match) {
      fromName = match[1].trim();
      fromEmail = match[2].trim();
    } else if (fromStr.includes("@")) {
      fromName = fromStr.split("@")[0];
      fromEmail = fromStr.trim();
    }

    const dateStr = dateHeader ? dateHeader.value : new Date(parseInt(detail.internalDate)).toUTCString();
    const snippet = detail.snippet || "";
    
    const body = getGmailMessageBody(detail.payload) || snippet;

    return {
      id: emailId,
      subject,
      from: fromStr,
      fromName,
      fromEmail,
      snippet,
      body,
      date: new Date(dateStr).toISOString(),
      needsReply: false,
      category: subject.toLowerCase().includes("colleague") ? "school" : "parents",
    } as GmailEmail;
  } catch (err) {
    console.error(`Error fetching email detail for ID ${emailId}:`, err);
    return null;
  }
}

export async function fetchGmailEmails(accessToken: string, type: "inbox" | "sent" = "inbox"): Promise<GmailEmail[]> {
  try {
    // Fetch last messages from inbox (30 days to cover past weeks completely, without aggressive category filtering)
    const searchQuery = type === "sent" ? "in:sent newer_than:30d" : "newer_than:30d -in:draft -in:sent";
    const listRes = await fetchWithTimeout(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=${encodeURIComponent(searchQuery)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
      8000 // 8 seconds timeout for the list request
    );

    if (!listRes.ok) {
      const errorText = await listRes.text();
      console.error("Gmail list messages failed:", errorText);
      throw new Error(`Gmail API error: ${listRes.status}`);
    }

    const listData = (await listRes.json()) as { messages?: { id: string }[] };
    const messages = listData.messages || [];

    // To prevent connection exhaustion & ConnectTimeoutError, fetch details in chunks with concurrency logic.
    // Batch size of 10 gives great performance while avoiding undici connection timeouts.
    const results: GmailEmail[] = [];
    const batchSize = 10;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchPromises = batch.map(async (msg) => {
        try {
          const detailRes = await fetchWithTimeout(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
              },
            },
            3000 // 3 seconds timeout for individual message retrieval
          );

          if (!detailRes.ok) {
            return null;
          }

          const detail = await detailRes.json();
          const headers = detail.payload?.headers || [];
          
          const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === "subject");
          const participantHeader = headers.find((h: any) => h.name.toLowerCase() === (type === "sent" ? "to" : "from"));
          const dateHeader = headers.find((h: any) => h.name.toLowerCase() === "date");

          const subject = subjectHeader ? subjectHeader.value : "No Subject";
          const fromStr = participantHeader ? participantHeader.value : "Unknown";
          
          // Parse fromName and fromEmail from something like "Anita Sharma <colleague@vasantvalley.edu.in>"
          let fromName = fromStr;
          let fromEmail = "";
          const match = fromStr.match(/(.*)<(.*)>/);
          if (match) {
            fromName = match[1].trim();
            fromEmail = match[2].trim();
          } else if (fromStr.includes("@")) {
            fromName = fromStr.split("@")[0];
            fromEmail = fromStr.trim();
          }

          const dateStr = dateHeader ? dateHeader.value : new Date(parseInt(detail.internalDate)).toUTCString();
          const snippet = detail.snippet || "";

          // Determine if it needs reply based on subject, snippet, or just any unread message
          // Let's check if the thread is unread
          const labelIds = detail.labelIds || [];
          const isUnread = labelIds.includes("UNREAD");
          const needsReply = isUnread && (
            subject.toLowerCase().includes("question") || 
            subject.toLowerCase().includes("assessment") || 
            subject.toLowerCase().includes("syllabus") ||
            subject.toLowerCase().includes("worksheet") ||
            subject.toLowerCase().includes("please") ||
            snippet.toLowerCase().includes("please") ||
            snippet.toLowerCase().includes("could you") ||
            snippet.toLowerCase().includes("would you")
          ) || isUnread; // default to needs reply if unread for this assistant's visibility

          const body = getGmailMessageBody(detail.payload) || snippet;

          return {
            id: msg.id,
            subject,
            from: fromStr,
            fromName,
            fromEmail,
            snippet,
            body,
            date: new Date(dateStr).toISOString(),
            needsReply,
            category: subject.toLowerCase().includes("colleague") ? "school" : "parents",
          } as GmailEmail;
        } catch (err) {
          console.error(`Error fetching email detail for ID ${msg.id}:`, err);
          return null;
        }
      });

      const chunkResults = await Promise.all(batchPromises);
      for (const item of chunkResults) {
        if (item) {
          results.push(item);
        }
      }
    }

    return results;
  } catch (err) {
    console.error("fetchGmailEmails root error:", err);
    throw err;
  }
}

