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
    } catch (e) {}
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
    } catch (e) {}
    const error = new Error(errorMsg);
    (error as any).status = res.status;
    throw error;
  }

  return await res.json();
}
