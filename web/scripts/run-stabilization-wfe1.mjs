import { appendFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, execFileSync, spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
if (args.some(arg => /^(--(config|output|reporter|update-snapshots)(=|$)|-c$)/.test(arg))) throw new Error("Pilot evidence paths/reporters and approved baselines must not be overridden");
const listing = args.includes("--list");
let run;
if (!listing) {
  if (!process.env.HRMS_PILOT_EVIDENCE) throw new Error("HRMS_PILOT_EVIDENCE is required");
  const evidence = path.resolve(process.env.HRMS_PILOT_EVIDENCE);
  mkdirSync(evidence, { recursive: true });
  run = mkdtempSync(path.join(evidence, "run-"));
  writeFileSync(path.join(run, "source-candidate.json"), execFileSync("python3", ["-B", "docs/qa/agentic/source_fingerprint.py"], { cwd: root }));
  writeFileSync(path.join(run, "invocation.json"), JSON.stringify({ argv: process.argv, node: process.version, createdAt: new Date().toISOString() }, null, 2));
  console.log(`Pilot evidence: ${run}`);
}
const child = spawn(process.execPath, [path.join(root, "web/node_modules/@playwright/test/cli.js"), "test", "--config", path.join(root, "web/playwright.stabilization-wfe1.config.ts"), ...args, ...(listing ? ["--reporter=list"] : [])], {
  cwd: root, env: { ...process.env, HRMS_PILOT_RUN: run ?? "" }, stdio: ["inherit", "pipe", "pipe"],
});
for (const [stream, destination] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) stream.on("data", chunk => {
  if (run) appendFileSync(path.join(run, "execution.log"), chunk);
  destination.write(chunk);
});
child.on("error", error => { if (run) appendFileSync(path.join(run, "execution.log"), String(error)); process.exitCode = 1; });
child.on("close", (code, signal) => {
  if (run) writeFileSync(path.join(run, "exit.json"), JSON.stringify({ code, signal }, null, 2));
  const sanitized = run ? spawnSync("python3", ["-B", "docs/qa/agentic/sanitize_pilot_traces.py", run], { cwd: root, encoding: "utf8" }) : null;
  if (run && sanitized?.status !== 0) {
    // Keep the original machine results and fail evidence completion explicitly.
    writeFileSync(path.join(run, "evidence-postprocess-error.json"), JSON.stringify({ stage: "trace credential redaction", status: sanitized?.status, error: sanitized?.error?.name ?? "postprocessing failed; inspect private runner stderr" }, null, 2));
    process.stderr.write("Pilot trace redaction failed; evidence requires review.\n");
  }
  process.exitCode = sanitized && sanitized.status !== 0 ? 1 : code ?? 1;
});
