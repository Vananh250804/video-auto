export interface Check {
  id: string;
  label: string;
  level: "required" | "feature";
  ok: boolean;
  detail: string;
  fix?: string;
}

export function parseEnv(text: string): Record<string, string>;
export function runChecks(opts?: {
  env?: Record<string, string> | null;
  probe?: (bin: string, args?: string[]) => string | null;
  root?: string;
  storage?: string;
}): Check[];
