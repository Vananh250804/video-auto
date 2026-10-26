import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { loadConfig, projectRoot, requireEnv } from "../core/config/index.ts";

// Đăng nhập Google Drive một lần, lưu refresh token vào .env
loadConfig();
const clientId = requireEnv("GOOGLE_CLIENT_ID");
const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
const SCOPE = "https://www.googleapis.com/auth/drive";

const server = createServer();
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
const redirectUri = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

const url = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: "code",
  scope: SCOPE,
  access_type: "offline",
  prompt: "consent",
})}`;
console.log(`Mở link này trong trình duyệt, đăng nhập tài khoản Google có Drive chứa video:\n\n${url}\n`);

const code = await new Promise<string>((resolveCode, reject) => {
  server.on("request", (req, res) => {
    const params = new URL(req.url ?? "/", redirectUri).searchParams;
    const c = params.get("code");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(c ? "<h2>Đã đăng nhập. Quay lại cửa sổ terminal.</h2>" : "<h2>Không đăng nhập được.</h2>");
    if (c) resolveCode(c);
    else reject(new Error(params.get("error") ?? "Không nhận được mã đăng nhập"));
  });
});
server.close();

const res = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
});
const data: any = await res.json();
if (!data.refresh_token) {
  console.error(`Không lấy được refresh token: ${JSON.stringify(data)}`);
  process.exit(1);
}

const envFile = resolve(projectRoot(), ".env");
const env = existsSync(envFile) ? readFileSync(envFile, "utf8") : "";
const line = `GOOGLE_REFRESH_TOKEN=${data.refresh_token}`;
writeFileSync(envFile, /^GOOGLE_REFRESH_TOKEN=.*$/m.test(env) ? env.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, line) : `${env.trimEnd()}\n${line}\n`);
console.log("Đã lưu GOOGLE_REFRESH_TOKEN vào .env. Xong!");
