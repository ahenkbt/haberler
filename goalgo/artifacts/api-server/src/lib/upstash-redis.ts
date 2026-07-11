/** Upstash Redis REST — portal RSS / Yektube cache ile aynı env deseni. */

export function upstashConfigured(): boolean {
  return Boolean(
    String(process.env.UPSTASH_REDIS_REST_URL ?? "").trim() &&
      String(process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim(),
  );
}

export async function upstashCommand<T>(command: unknown[]): Promise<T | null> {
  const baseUrl = String(process.env.UPSTASH_REDIS_REST_URL ?? "").trim().replace(/\/+$/, "");
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim();
  if (!baseUrl || !token) return null;

  const res = await fetch(`${baseUrl}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { result?: T };
  return json.result ?? null;
}
