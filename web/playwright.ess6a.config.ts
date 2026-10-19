import config from "./playwright.ess6-regression.config";
const remediationConfig = { ...config, testMatch: ["ess6a-browser-remediation.spec.ts"], use: { ...config.use, baseURL: "http://127.0.0.1:3309" }, outputDir: process.env.ESS6A_OUTPUT_DIR || "test-results/ess6a-extra" };
export default remediationConfig;
