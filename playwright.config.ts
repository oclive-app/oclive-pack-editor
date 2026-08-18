import { defineConfig, devices } from '@playwright/test'

const existingNoProxy = process.env.NO_PROXY ?? process.env.no_proxy ?? ''
const noProxy = Array.from(
  new Set([
    ...existingNoProxy.split(',').map((entry) => entry.trim()).filter(Boolean),
    '127.0.0.1',
    'localhost',
  ]),
).join(',')

// Playwright's own webServer readiness probe also inherits proxy variables.
// Keep loopback traffic local for both the runner and the preview child process.
process.env.NO_PROXY = noProxy
process.env.no_proxy = noProxy

/**
 * 冒烟：对 `vite preview` 产出的静态站点做端到端检查。
 * 需先 `npm run build`（CI 已在同 job 中构建）。
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NO_PROXY: noProxy,
      no_proxy: noProxy,
    },
  },
})
