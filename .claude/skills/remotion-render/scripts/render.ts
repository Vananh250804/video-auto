import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { renderEdit } from "../../../../core/render/render.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string", short: "o" },
    video: { type: "string" },
    captions: { type: "string" },
    style: { type: "string" },
  },
});

const editFile = positionals[0];
if (!values.out || (!editFile && !values.video)) {
  console.error("Cách dùng:\n  npm run render -- <edit.json> --out <file.mp4>\n  npm run render -- --video <video> [--captions captions.json] [--style tiktok|box|karaoke|none] --out <file.mp4>");
  process.exit(1);
}

try {
  const spec = editFile
    ? JSON.parse(await readFile(editFile, "utf8"))
    : { video: values.video, captions: values.captions, captionStyle: values.style };
  let last = -1;
  const result = await renderEdit(spec, values.out, {
    onProgress: (p) => {
      const pct = Math.floor(p * 10) * 10;
      if (pct !== last) {
        last = pct;
        process.stderr.write(`Đang render ${pct}%\n`);
      }
    },
  });
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
