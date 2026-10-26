import { requireEnv } from "../core/config/index.ts";

const BASE = "https://api.elevenlabs.io/v1";

export async function elevenlabsFetch(path: string, init: RequestInit): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), "xi-api-key": requireEnv("ELEVENLABS_API_KEY") },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status} ${res.statusText}: ${body.slice(0, 500)}`);
  }
  return res.json();
}
