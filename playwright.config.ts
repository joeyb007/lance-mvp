import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  use: { baseURL: 'http://localhost:4317', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
  webServer: { command: 'npm run build && npx vite preview --port 4317 --strictPort', port: 4317, reuseExistingServer: false },
})
