import { requireEnv } from "../core/config/index.ts";

const BASE = "https://api.elevenlabs.io/v1";

async function request(path: string, init: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), "xi-api-key": requireEnv("ELEVENLABS_API_KEY") },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status} ${res.statusText}: ${body.slice(0, 500)}`);
  }
  return res;
}

export async function elevenlabsFetch(path: string, init: RequestInit): Promise<any> {
  return (await request(path, init)).json();
}

// API trả thẳng file âm thanh (sound-generation, text-to-speech không timestamps).
export async function elevenlabsAudio(path: string, init: RequestInit): Promise<Buffer> {
  return Buffer.from(await (await request(path, init)).arrayBuffer());
}
