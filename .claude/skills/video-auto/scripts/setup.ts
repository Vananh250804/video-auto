import { spawn } from "node:child_process";
import { parseArgs } from "node:util";
import { loadConfig } from "../../../../core/config/index.ts";
import { CHECK_NAMES, findTelegramChats, runCheck, testVoice, type CheckName } from "../../../../core/setup/checks.ts";
import {
  STEPS, envFile, ensureEnvFile, markStep, nextStep, presentKeys, readEnvContent, readState, saveState, writeKey, type Step,
} from "../../../../core/setup/setup.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: "string" },
    call: { type: "string" },
    text: { type: "string" },
    skip: { type: "boolean", default: false },
  },
});

const USAGE = `Cách dùng:
  npm run setup -- status                      xem đã cài tới đâu (không in khóa)
  npm run setup -- init --name "<tên>" --call "<cách gọi>"
  npm run setup -- open-env                    mở file .env để dán khóa
  printf '%s' '<giá trị>' | npm run setup -- set-key <TÊN_KHÓA>
  npm run setup -- check <${CHECK_NAMES.join("|")}|all>
  npm run setup -- test-voice [--text "câu đọc thử"]
  npm run setup -- telegram-chat               tìm chat id của bạn sau khi gửi /start cho bot
  npm run setup -- step <${STEPS.join("|")}> [--skip]   ghi nhận một bước đã xong (hoặc bỏ qua)
  npm run setup -- done                        hoàn tất cài đặt`;

const print = (x: unknown) => console.log(JSON.stringify(x, null, 2));

async function readStdin(): Promise<string> {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

// Mở .env bằng trình soạn thảo mặc định của hệ điều hành, không qua shell
function openFile(file: string) {
  const [cmd, args]: [string, string[]] =
    process.platform === "win32" ? ["notepad", [file]] : process.platform === "darwin" ? ["open", ["-t", file]] : ["xdg-open", [file]];
  spawn(cmd, args, { detached: true, stdio: "ignore", windowsHide: false }).unref();
}

try {
  loadConfig();
  const [cmd, arg] = positionals;
  switch (cmd) {
    case "status": {
      const state = await readState();
      const checks: Record<string, { ok: boolean; message: string }> = {};
      for (const name of ["node", "ffmpeg", "deps"] as CheckName[]) checks[name] = await runCheck(name);
      print({
        onboarded: state.onboarded,
        name: state.name ?? null,
        call: state.call ?? null,
        stepsDone: state.done,
        stepsSkipped: state.skipped,
        nextStep: nextStep(state),
        machine: checks,
        keysPresent: Object.fromEntries(Object.entries(presentKeys(readEnvContent())).filter(([, v]) => v).map(([k]) => [k, true])),
        envFileExists: readEnvContent() !== "",
      });
      break;
    }

    case "init": {
      if (!values.name) throw new Error(USAGE);
      const state = await readState();
      await saveState(markStep({ ...state, name: values.name, call: values.call || values.name }, "hello"));
      print({ ok: true });
      break;
    }

    case "open-env": {
      const created = await ensureEnvFile();
      openFile(envFile());
      print({ file: envFile(), createdFromExample: created, note: "Dán giá trị sau dấu = của đúng dòng, lưu file, rồi báo 'xong'." });
      break;
    }

    case "set-key": {
      if (!arg) throw new Error(USAGE);
      const value = (await readStdin()).trim();
      if (!value) throw new Error("Chưa có giá trị. Truyền giá trị qua stdin, không đặt trong tham số lệnh.");
      await writeKey(arg, value);
      print({ ok: true, wrote: arg });
      break;
    }

    case "check": {
      const names = arg === "all" ? CHECK_NAMES : [arg as CheckName];
      if (!names.every((n) => CHECK_NAMES.includes(n))) throw new Error(USAGE);
      const out: Record<string, { ok: boolean; message: string }> = {};
      for (const n of names) out[n] = await runCheck(n);
      print(out);
      process.exitCode = Object.values(out).every((r) => r.ok) ? 0 : 2;
      break;
    }

    case "test-voice":
      print({ file: await testVoice(values.text || "Xin chào, đây là giọng đọc thử của video auto.") });
      break;

    case "telegram-chat": {
      const chats = await findTelegramChats();
      print(chats.length ? { chats, note: "Điền id vào TELEGRAM_ALLOWED_CHAT_IDS bằng lệnh set-key. Nhiều chat thì cách nhau dấu phẩy." } : { chats, note: "Chưa thấy tin nào. Mở bot trên Telegram, bấm Start (gõ /start) rồi chạy lại." });
      break;
    }

    case "step": {
      if (!arg || !(STEPS as readonly string[]).includes(arg)) throw new Error(USAGE);
      await saveState(markStep(await readState(), arg as Step, values.skip ? "skipped" : "done"));
      print({ ok: true, nextStep: nextStep(await readState()) });
      break;
    }

    case "done": {
      const state = await readState();
      const missing = STEPS.filter((s) => !state.done.includes(s) && !state.skipped.includes(s));
      if (missing.length) throw new Error(`Còn bước chưa xong: ${missing.join(", ")}`);
      await saveState({ ...state, onboarded: true });
      print({ onboarded: true });
      break;
    }

    default:
      throw new Error(USAGE);
  }
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
