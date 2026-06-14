export interface GmailEmail {
  id: string;
  subject: string;
  from: string;
  fromName: string;
  fromEmail: string;
  snippet: string;
  date: string;
  needsReply: boolean;
  category: string;
}

export async function fetchGmailEmails(accessToken: string): Promise<GmailEmail[]> {
  try {
    // Fetch last messages from inbox
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=newer_than:14d+-in:draft+-category:promotions+-category:social",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!listRes.ok) {
      const errorText = await listRes.text();
      console.error("Gmail list messages failed:", errorText);
      throw new Error(`Gmail API error: ${listRes.status}`);
    }

    const listData = (await listRes.json()) as { messages?: { id: string }[] };
    const messages = listData.messages || [];

    const emailPromises = messages.map(async (msg) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
          }
        );

        if (!detailRes.ok) {
          return null;
        }

        const detail = await detailRes.json();
        const headers = detail.payload?.headers || [];
        
        const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === "subject");
        const fromHeader = headers.find((h: any) => h.name.toLowerCase() === "from");
        const dateHeader = headers.find((h: any) => h.name.toLowerCase() === "date");

        const subject = subjectHeader ? subjectHeader.value : "No Subject";
        const fromStr = fromHeader ? fromHeader.value : "Unknown Sender";
        
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

        return {
          id: msg.id,
          subject,
          from: fromStr,
          fromName,
          fromEmail,
          snippet,
          date: new Date(dateStr).toISOString(),
          needsReply,
          category: subject.toLowerCase().includes("colleague") ? "school" : "parents",
        } as GmailEmail;
      } catch (err) {
        console.error(`Error fetching email detail for ID ${msg.id}:`, err);
        return null;
      }
    });

    const results = await Promise.all(emailPromises);
    return results.filter((item): item is GmailEmail => item !== null);
  } catch (err) {
    console.error("fetchGmailEmails root error:", err);
    throw err;
  }
}
