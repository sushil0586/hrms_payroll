import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir: './tests/leave-visual-phase2', workers: 2, retries: 0, timeout: 240000,
 reporter: [['list'], ['json', {outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_FILE}]],
 use: {baseURL: process.env.NEXT_PUBLIC_APP_URL, trace: 'on', actionTimeout: 15000},
 projects: [{name:'chromium',use:{...devices['Desktop Chrome']}},{name:'firefox',use:{...devices['Desktop Firefox']}},{name:'webkit',use:{...devices['Desktop Safari']}}],
});
