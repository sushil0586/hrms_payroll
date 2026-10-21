import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
 testDir:"./tests/leave-completion",workers:2,retries:0,timeout:180000,
 outputDir:"../docs/qa/evidence/leave-completion-phase1/latest/results",
 reporter:[["list"],["json",{outputFile:"../docs/qa/evidence/leave-completion-phase1/latest/results.json"}]],
 use:{baseURL:process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3220",trace:"on",actionTimeout:15000},
 projects:["chromium","firefox","webkit"].map(name=>({name,use:{...devices[name==="chromium"?"Desktop Chrome":name==="firefox"?"Desktop Firefox":"Desktop Safari"]}})),
});
