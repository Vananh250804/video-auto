import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadConfig, projectRoot } from "../../../../core/config/index.ts";
import { addLessons, loadLessons, removeLesson, type LessonScope } from "../../../../core/knowledge/lessons.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    scope: { type: "string" },
    rule: { type: "string" },
    workflow: { type: "string" },
    limit: { type: "string", default: "20" },
  },
});

const [cmd, arg] = positionals;
const USAGE = `Cách dùng:
  npm run lessons -- list
  npm run lessons -- add --scope script|edit --rule "quy tắc" [--workflow shop-ads]
  npm run lessons -- forget <mã>
  npm run lessons -- errors [--limit 20]     lỗi job gần đây chưa có trong knowledge/known-errors.json`;

try {
  if (cmd === "list") {
    const lessons = await loadLessons();
    if (!lessons.length) console.log("(chưa có bài học)");
    for (const l of lessons) console.log(`${l.id}  [${l.scope}${l.workflow ? `, ${l.workflow}` : ""}] ${l.rule}`);
  } else if (cmd === "add") {
    const scope = values.scope as LessonScope;
    if (scope !== "script" && scope !== "edit") throw new Error("--scope phải là script hoặc edit");
    if (!values.rule?.trim()) throw new Error("Thiếu --rule");
    const added = await addLessons([{ scope, rule: values.rule, source: "manual", ...(values.workflow ? { workflow: values.workflow } : {}) }]);
    console.log(added.length ? `Đã thêm ${added[0].id}: ${added[0].rule}` : "Quy tắc này đã có, không thêm.");
  } else if (cmd === "forget" && arg) {
    const removed = await removeLesson(arg);
    console.log(removed ? `Đã bỏ: ${removed.rule}` : `Không có bài học ${arg}`);
  } else if (cmd === "errors") {
    const file = resolve(projectRoot(), loadConfig().workspace_dir, "logs", "errors.jsonl");
    if (!existsSync(file)) {
      console.log("(chưa có lỗi nào)");
    } else {
      const entries = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
      const unknown = entries.filter((e) => !e.known).slice(-Number(values.limit));
      console.log(unknown.length ? unknown.map((e) => `${e.at} ${e.jobId} [${e.step}] ${e.error}`).join("\n\n") : "(mọi lỗi đều đã có cách sửa trong known-errors.json)");
    }
  } else {
    console.error(USAGE);
    process.exit(1);
  }
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
