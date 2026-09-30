export type ImirRequest = { path: string; method?: string; body?: unknown };

export async function imirRequest<T>({ path, method = "GET", body }: ImirRequest): Promise<T> {
  const baseUrl = process.env.IMIR_API_BASE_URL;
  const token = process.env.IMIR_API_TOKEN;
  if (!baseUrl || !token) throw new Error("IMIR_API_BASE_URL and IMIR_API_TOKEN are required");

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await response.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(`IMIR ${response.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  return data as T;
}
