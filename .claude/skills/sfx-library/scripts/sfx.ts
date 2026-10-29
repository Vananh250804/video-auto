import { existsSync, readdirSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadConfig, projectRoot } from "../../../../core/config/index.ts";
import { generateSfx, loadSfxCatalog, type SfxEntry } from "../../../../core/audio/sfx.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    only: { type: "string", short: "o" },
    variants: { type: "string", short: "n", default: "2" },
    force: { type: "boolean", default: false },
  },
});

const USAGE = `Cách dùng:
  npm run sfx -- list
  npm run sfx -- generate [--only ui-pop,impact-thud] [--variants 2] [--force]
  npm run sfx -- pick <nhóm-tên> <số bản>      # ví dụ: pick ui-pop 2
  npm run sfx -- pick all <số bản>             # chọn cùng một bản cho mọi sfx chưa có`;

const cfg = loadConfig();
const draftsDir = resolve(projectRoot(), cfg.workspace_dir, "sfx-drafts");
const id = (e: SfxEntry) => `${e.group}-${e.name}`;
const draft = (e: SfxEntry, n: number) => resolve(draftsDir, id(e), `v${n}.mp3`);
const installed = (e: SfxEntry) => existsSync(resolve(projectRoot(), e.file));
const draftsOf = (e: SfxEntry) => {
  const dir = resolve(draftsDir, id(e));
  return existsSync(dir) ? readdirSync(dir).filter((f) => /^v\d+\.mp3$/.test(f)).sort() : [];
};
const print = (x: unknown) => console.log(JSON.stringify(x, null, 2));

function select(catalog: SfxEntry[]): SfxEntry[] {
  if (!values.only) return catalog;
  const want = new Set(values.only.split(",").map((s) => s.trim()));
  const unknown = [...want].filter((w) => !catalog.some((e) => id(e) === w));
  if (unknown.length) throw new Error(`Không có trong assets/sfx/catalog.yaml: ${unknown.join(", ")}`);
  return catalog.filter((e) => want.has(id(e)));
}

// Trang nghe thử: mở bằng trình duyệt, mỗi sfx một hàng các bản nháp.
async function writeIndex(catalog: SfxEntry[]): Promise<string> {
  const rows = catalog.map((e) => {
    const players = draftsOf(e).map((f) => `<div><small>${f}</small><audio controls preload="none" src="${id(e)}/${f}"></audio></div>`).join("");
    return `<tr><td><b>${id(e)}</b><br><small>${e.use}</small>${installed(e) ? "<br>✅ đã chọn" : ""}</td><td>${players || "chưa tạo"}</td></tr>`;
  });
  const html = `<!doctype html><meta charset="utf-8"><title>SFX nháp</title>
<style>body{font-family:system-ui;margin:16px}td{border-bottom:1px solid #ddd;padding:8px;vertical-align:top}td div{display:inline-block;margin-right:12px}</style>
<p>Chọn bản ưng ý: <code>npm run sfx -- pick &lt;tên&gt; &lt;số&gt;</code></p><table>${rows.join("")}</table>`;
  const file = resolve(draftsDir, "index.html");
  await writeFile(file, html);
  return file;
}

try {
  const catalog = loadSfxCatalog();
  const [cmd, target, num] = positionals;
  switch (cmd) {
    case "list":
      print(catalog.map((e) => ({ id: id(e), file: e.file, installed: installed(e), drafts: draftsOf(e).length, use: e.use })));
      break;

    case "generate": {
      const variants = Math.max(1, Math.min(5, Number(values.variants) || 2));
      const todo = select(catalog).filter((e) => values.force || draftsOf(e).length < variants);
      const failed: string[] = [];
      let made = 0;
      for (const e of todo) {
        await mkdir(resolve(draftsDir, id(e)), { recursive: true });
        for (let n = 1; n <= variants; n++) {
          if (!values.force && existsSync(draft(e, n))) continue;
          console.error(`Đang tạo ${id(e)} v${n}...`);
          try {
            await generateSfx(e, draft(e, n), { model: cfg.elevenlabs.sfx_model, promptInfluence: cfg.elevenlabs.sfx_prompt_influence });
            made++;
          } catch (err) {
            failed.push(`${id(e)} v${n}: ${(err as Error).message}`);
            if (/40[13]/.test((err as Error).message)) throw new Error(failed.join("\n")); // sai key / hết credit: dừng luôn
          }
        }
      }
      print({ made, failed, preview: await writeIndex(catalog) });
      if (failed.length) process.exitCode = 2;
      break;
    }

    case "pick": {
      const n = Number(num);
      if (!target || !Number.isInteger(n) || n < 1) throw new Error(USAGE);
      const entries = target === "all" ? catalog.filter((e) => !installed(e)) : catalog.filter((e) => id(e) === target);
      if (entries.length === 0 && target !== "all") throw new Error(`Không có "${target}" trong danh mục.`);
      const picked: string[] = [];
      const missing: string[] = [];
      for (const e of entries) {
        if (!existsSync(draft(e, n))) { missing.push(`${id(e)} v${n}`); continue; }
        await copyFile(draft(e, n), resolve(projectRoot(), e.file));
        picked.push(e.file);
      }
      await writeIndex(catalog);
      print({ picked, missing });
      break;
    }

    default:
      throw new Error(USAGE);
  }
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
