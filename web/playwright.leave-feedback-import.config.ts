import { defineConfig } from "@playwright/test";
import base from "./playwright.leave-closure-neighbors.config";
export default defineConfig({ ...base, workers: 1, use:{...base.use,baseURL:"http://127.0.0.1:3218"}, outputDir:"../docs/qa/evidence/leave-feedback/latest-import/results", reporter:[["list"],["json",{outputFile:"../docs/qa/evidence/leave-feedback/latest-import/results.json"}]] });
