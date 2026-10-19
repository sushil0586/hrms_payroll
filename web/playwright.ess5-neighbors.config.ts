import { defineConfig, devices } from "@playwright/test";
// Reuse unchanged certified suites; evidence and runtime are isolated for ESS-5.
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["ess1-dashboard-profile-certification.spec.ts", "ess2-attendance-certification.spec.ts", "ess3-leave-certification.spec.ts", "ess4-documents-payroll-certification.spec.ts"],
  workers: 1, retries: 0, maxFailures: 0, timeout: 90_000,
  expect: {timeout:10_000},
  outputDir: `test-results/ess5-${process.env.ESS5_NEIGHBOR_SUITE}`,
  reporter: [["list"],["json",{outputFile:`${process.env.HRMS_CERT_EVIDENCE_DIR}/browser-results.json`}]],
  use:{baseURL:process.env.ESS5_NEIGHBOR_URL,trace:"on",screenshot:"only-on-failure",timezoneId:"Asia/Tokyo"},
  projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}},{name:"firefox",use:{...devices["Desktop Firefox"]}},{name:"webkit",use:{...devices["Desktop Safari"]}}],
});
