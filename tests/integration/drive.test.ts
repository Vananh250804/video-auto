import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GoogleDriveStorage } from "../../integrations/storage/google-drive/index.ts";

afterEach(() => mock.restoreAll());

const cfg = { clientId: "cid", clientSecret: "sec", refreshToken: "rt", inputFolderId: "inputFolder123", outputFolderId: "outFolder123" };

test("Drive: thư mục → tải video mới nhất, token dùng lại", async () => {
  const calls: string[] = [];
  mock.method(globalThis, "fetch", async (url: string, init: any = {}) => {
    calls.push(url);
    if (url.includes("oauth2")) {
      assert.equal(new URLSearchParams(init.body).get("refresh_token"), "rt");
      return Response.json({ access_token: "at", expires_in: 3600 });
    }
    assert.equal(init.headers.Authorization, "Bearer at");
    if (url.includes("/files/inputFolder123?")) return Response.json({ id: "inputFolder123", name: "Input", mimeType: "application/vnd.google-apps.folder" });
    if (url.includes("/files?q=")) {
      assert.match(decodeURIComponent(url), /'inputFolder123' in parents and mimeType contains 'video\/'/);
      return Response.json({ files: [{ id: "vid9876543210", name: "túi/xách:mới.mp4", mimeType: "video/mp4" }] });
    }
    if (url.includes("/files/vid9876543210?alt=media")) return new Response("VIDEO-BYTES");
    throw new Error(`URL lạ: ${url}`);
  });
  const dir = await mkdtemp(join(tmpdir(), "drive-"));
  const drive = new GoogleDriveStorage(cfg);
  const f = await drive.download("", dir);
  assert.equal(f.name, "túi_xách_mới.mp4");
  assert.equal(await readFile(f.path, "utf8"), "VIDEO-BYTES");
  assert.equal(calls.filter((c) => c.includes("oauth2")).length, 1);
});

test("Drive: link file không phải video thì báo lỗi", async () => {
  mock.method(globalThis, "fetch", async (url: string) =>
    url.includes("oauth2") ? Response.json({ access_token: "at", expires_in: 3600 }) : Response.json({ id: "doc1234567890", name: "ghi chú", mimeType: "application/pdf" }));
  await assert.rejects(new GoogleDriveStorage(cfg).download("https://drive.google.com/file/d/doc1234567890/view", tmpdir()), /không phải video/);
});

test("Drive: upload resumable vào thư mục output, trả link xem", async () => {
  const dir = await mkdtemp(join(tmpdir(), "drive-"));
  const file = join(dir, "final.mp4");
  await writeFile(file, "FINAL");
  let meta: any;
  let uploaded = "";
  mock.method(globalThis, "fetch", async (url: string, init: any = {}) => {
    if (url.includes("oauth2")) return Response.json({ access_token: "at", expires_in: 3600 });
    if (url.includes("uploadType=resumable")) {
      meta = JSON.parse(init.body);
      assert.equal(init.headers["X-Upload-Content-Length"], "5");
      return new Response(null, { status: 200, headers: { Location: "https://upload.example/session1" } });
    }
    if (url === "https://upload.example/session1") {
      uploaded = await new Response(init.body).text();
      return Response.json({ id: "new1", webViewLink: "https://drive.google.com/file/d/new1/view" });
    }
    throw new Error(url);
  });
  const r = await new GoogleDriveStorage(cfg).upload(file, "kết quả.mp4");
  assert.deepEqual(meta, { name: "kết quả.mp4", parents: ["outFolder123"] });
  assert.equal(uploaded, "FINAL");
  assert.equal(r.url, "https://drive.google.com/file/d/new1/view");
});

test("Drive: refresh token hết hạn thì hướng dẫn đăng nhập lại", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ error: "invalid_grant" }, { status: 400 }));
  await assert.rejects(new GoogleDriveStorage(cfg).download("1BareIdABCDEFG", tmpdir()), /invalid_grant.*drive:auth/);
});
