import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel:false, workers:1, timeout:30000,
  forbidOnly: !!process.env.CI, retries: process.env.CI ? 1 : 0,
  reporter:'list', outputDir:process.env.PLAYWRIGHT_OUTPUT_DIR || 'test-results',
  use:{baseURL:'http://127.0.0.1:4174/world-work-clock/',headless:true,channel:process.env.CI?undefined:'chrome',viewport:{width:1440,height:1000}},
  webServer:{command:'npm run preview -- --port 4174',url:'http://127.0.0.1:4174/world-work-clock/',reuseExistingServer:false,timeout:30000},
});
