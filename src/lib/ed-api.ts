const ED_BASE_URL = "https://us.edstem.org";

async function edFetch(path: string, token: string, options?: RequestInit) {
  const res = await fetch(`${ED_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Ed API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function getUserInfo(token: string) {
  return edFetch("/api/user", token);
}

export async function listThreads(
  token: string,
  courseId: number,
  limit = 100,
  offset = 0,
  sort = "new"
) {
  return edFetch(
    `/api/courses/${courseId}/threads?limit=${limit}&offset=${offset}&sort=${sort}`,
    token
  );
}

export async function getThread(token: string, threadId: number) {
  return edFetch(`/api/threads/${threadId}`, token);
}

export async function postThread(
  token: string,
  courseId: number,
  params: Record<string, unknown>
) {
  return edFetch(`/api/courses/${courseId}/threads`, token, {
    method: "POST",
    body: JSON.stringify({ thread: params }),
  });
}

export async function uploadFile(
  token: string,
  file: ArrayBuffer,
  filename: string,
  contentType: string
) {
  const formData = new FormData();
  formData.append("attachment", new Blob([file], { type: contentType }), filename);

  const res = await fetch(`${ED_BASE_URL}/api/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Ed API error ${res.status}: ${text}`);
  }

  return res.json();
}
