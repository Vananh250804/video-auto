import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { planEdit } from "../../../../core/planner/edit-planner.ts";
import { renderEdit } from "../../../../core/render/render.ts";
import { getLlm } from "../../../../integrations/registry.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    captions: { type: "string" },
    workflow: { type: "string", short: "w", default: "shop-ads" },
    request: { type: "string", short: "r" },
    out: { type: "string", short: "o" },
    render: { type: "string" },
    review: { type: "string" },
  },
});

const video = positionals[0];
if (!video || !values.out) {
  console.error('Cách dùng: npm run plan -- <video> --out <edit.json> [--captions captions.json] [--workflow shop-ads|faceless|dubbing] [--request "yêu cầu"] [--review report.md] [--render <final.mp4>]');
  process.exit(1);
}

try {
  const result = await planEdit({ video, captions: values.captions, workflow: values.workflow!, request: values.request, review: values.review ? await readFile(values.review, "utf8") : undefined, llm: getLlm() });
  await writeFile(values.out, JSON.stringify(result.edit, null, 2), "utf8");
  const summary: Record<string, unknown> = { editJson: values.out, notes: result.notes, dropped: result.dropped, overlays: result.edit.overlays?.length ?? 0, sfx: result.edit.sfx?.length ?? 0 };
  if (values.render) summary.render = await renderEdit(result.edit, values.render);
  console.log(JSON.stringify(summary, null, 2));
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
