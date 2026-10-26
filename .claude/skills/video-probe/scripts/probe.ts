import { probe } from "../../../../core/media/probe.ts";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Cách dùng: npm run probe -- <video> [video2 ...]");
  process.exit(1);
}

try {
  const results = await Promise.all(files.map((f) => probe(f)));
  console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
