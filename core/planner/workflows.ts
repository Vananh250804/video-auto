import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { projectRoot } from "../config/index.ts";

export interface Workflow {
  name: string;
  description: string;
  steps: string[];
  defaults: {
    captionStyle: string;
    originalVolume: number;
    overlays_hint: string;
    sfx_hint: string;
  };
}

export function listWorkflows(): string[] {
  return readdirSync(resolve(projectRoot(), "workflows"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(resolve(projectRoot(), "workflows", d.name, "workflow.yaml")))
    .map((d) => d.name);
}

export function loadWorkflow(name: string): Workflow {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`Tên workflow không hợp lệ: ${name}`);
  const file = resolve(projectRoot(), "workflows", name, "workflow.yaml");
  if (!existsSync(file)) throw new Error(`Không có workflow "${name}". Hiện có: ${listWorkflows().join(", ")}`);
  return parse(readFileSync(file, "utf8"));
}
