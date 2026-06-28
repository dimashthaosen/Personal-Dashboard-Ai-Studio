import { DriveFile } from "../types";

export async function fetchDriveFiles(
  accessToken: string,
  query?: string,
  limit: number = 50
): Promise<DriveFile[]> {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.append("pageSize", limit.toString());
  url.searchParams.append("fields", "files(id, name, mimeType, modifiedTime, webViewLink, owners, iconLink, size)");
  if (query) {
    url.searchParams.append("q", query);
  } else {
    // default: recent files not trashed
    url.searchParams.append("q", "trashed = false");
  }
  url.searchParams.append("orderBy", "modifiedTime desc");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    let errorMsg = `Drive API Error: ${res.status} ${res.statusText}`;
    try {
      const errData = await res.json();
      if (errData.error && errData.error.message) {
        errorMsg = errData.error.message;
      }
    } catch (_e) { void _e; }
    const error = new Error(errorMsg);
    (error as any).status = res.status;
    throw error;
  }

  const data = await res.json();
  return data.files || [];
}

export async function getDriveFile(
  accessToken: string,
  fileId: string
): Promise<DriveFile> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,modifiedTime,webViewLink,owners,iconLink,size`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    let errorMsg = `Drive API Error: ${res.status} ${res.statusText}`;
    try {
      const errData = await res.json();
      if (errData.error && errData.error.message) {
        errorMsg = errData.error.message;
      }
    } catch (_e) { void _e; }
    const error = new Error(errorMsg);
    (error as any).status = res.status;
    throw error;
  }

  return await res.json();
}

export async function createDriveFolder(accessToken: string, name: string): Promise<DriveFile> {
  const res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!res.ok) throw new Error(`Drive API Error: ${res.statusText}`);
  return res.json();
}

export async function createDriveDoc(accessToken: string, name: string, content: string): Promise<DriveFile> {
  const boundary = "-------314159265358979323846";
  const metadata = {
    name,
    mimeType: "application/vnd.google-apps.document"
  };

  let body = `--${boundary}\r\n`;
  body += 'Content-Type: application/json; charset=UTF-8\r\n\r\n';
  body += JSON.stringify(metadata) + '\r\n';
  body += `--${boundary}\r\n`;
  body += 'Content-Type: text/html; charset=UTF-8\r\n\r\n';
  body += content + '\r\n';
  body += `--${boundary}--`;

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) throw new Error(`Drive API Error: ${res.statusText}`);
  return res.json();
}

export async function uploadDriveFile(accessToken: string, name: string, content: string, mimeType: string = "text/plain"): Promise<DriveFile> {
  const boundary = "-------314159265358979323846";
  const metadata = { name };

  let body = `--${boundary}\r\n`;
  body += 'Content-Type: application/json; charset=UTF-8\r\n\r\n';
  body += JSON.stringify(metadata) + '\r\n';
  body += `--${boundary}\r\n`;
  body += `Content-Type: ${mimeType}\r\n\r\n`;
  body += content + '\r\n';
  body += `--${boundary}--`;

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) throw new Error(`Drive API Error: ${res.statusText}`);
  return res.json();
}

export async function getDriveFileContent(accessToken: string, fileId: string, mimeType: string): Promise<string> {
  const url = mimeType === "application/vnd.google-apps.document"
    ? `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`
    : `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Drive API Error: ${res.statusText}`);
  return res.text();
}
