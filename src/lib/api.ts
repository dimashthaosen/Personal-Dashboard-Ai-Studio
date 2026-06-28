import { getIdToken } from "./firebase";

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getIdToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("X-Id-Token", token);
  }

  return fetch(path, {
    ...options,
    headers
  });
}
