#!/usr/bin/env node
/**
 * Captures screenshots of every HRIS page for the Help section.
 *
 * Prerequisites:
 *   - API running on :8003
 *   - UI (Vite) running on :5183
 *   - npm install --no-save playwright
 *   - npx playwright install chromium
 *
 * Usage:
 *   node capture-screenshots.mjs
 */

import { chromium } from 'playwright'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOT_DIR = path.join(__dirname, 'ui', 'public', 'help')
const UI_URL = 'http://localhost:5183'

// Pages to capture
const PAGES = [
  { path: '/dashboard', name: 'dashboard', delay: 2000 },
  { path: '/employees', name: 'employees', delay: 1500 },
  { path: '/org-chart', name: 'org-chart', delay: 2000 },
  { path: '/departments', name: 'departments', delay: 1500 },
  { path: '/positions', name: 'positions', delay: 1500 },
  { path: '/timesheets', name: 'timesheets', delay: 1500 },
  { path: '/leave-requests', name: 'leave-requests', delay: 1500 },
  { path: '/leave-balances', name: 'leave-balances', delay: 1500 },
  { path: '/compensation', name: 'compensation', delay: 1500 },
  { path: '/benefits', name: 'benefits', delay: 1500 },
  { path: '/succession', name: 'succession', delay: 1500 },
  { path: '/job-postings', name: 'job-postings', delay: 1500 },
  { path: '/applicants', name: 'applicants', delay: 1500 },
  { path: '/pipeline', name: 'pipeline', delay: 2000 },
  { path: '/reviews', name: 'reviews', delay: 1500 },
  { path: '/goals', name: 'goals', delay: 1500 },
  { path: '/surveys', name: 'surveys', delay: 1500 },
  { path: '/onboarding', name: 'onboarding', delay: 1500 },
  { path: '/documents', name: 'documents', delay: 1500 },
  { path: '/reports', name: 'reports', delay: 2000 },
  { path: '/audit', name: 'audit-log', delay: 1500 },
  { path: '/workflows', name: 'workflows', delay: 1500 },
  { path: '/my-profile', name: 'my-profile', delay: 1500 },
  { path: '/settings', name: 'settings', delay: 1500 },
]

async function getJWT() {
  const script = `
import jwt, os, sys
sys.path.insert(0, '.')
with open('.env') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, val = line.split('=', 1)
            os.environ.setdefault(key.strip(), val.strip())
from api.db import init_db, get_connection
from api.deps import JWT_SECRET
init_db()
conn = get_connection()
row = conn.execute('SELECT id FROM users LIMIT 1').fetchone()
if not row:
    print('NO_USERS', end='')
    sys.exit(1)
token = jwt.encode({'sub': row['id'], 'exp': 9999999999}, JWT_SECRET, algorithm='HS256')
print(token, end='')
conn.close()
`
  const token = execSync(`cd "${__dirname}" && source .venv/bin/activate && python -c "${script.replace(/"/g, '\\"')}"`, {
    shell: '/bin/bash',
    encoding: 'utf-8',
  }).trim()
  return token
}

async function main() {
  console.log('🔑 Getting JWT token...')
  const jwt = await getJWT()
  console.log(`   Token: ${jwt.slice(0, 30)}...`)

  // Seed data first
  console.log('🌱 Seeding database...')
  try {
    const seedResp = await fetch('http://localhost:8003/api/seed', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
    })
    const seedData = await seedResp.json()
    console.log(`   Seeded: ${seedData.counts?.employees || 0} employees`)
  } catch (e) {
    console.log(`   Seed skipped: ${e.message}`)
  }

  console.log('🌐 Launching browser...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  // Set JWT in localStorage
  console.log('🔐 Injecting auth token...')
  await page.goto(`${UI_URL}/login`, { waitUntil: 'networkidle' })
  await page.evaluate((token) => {
    localStorage.setItem('hris_jwt', token)
  }, jwt)

  // Capture each page
  for (const { path: pagePath, name, delay } of PAGES) {
    const url = `${UI_URL}${pagePath}`
    console.log(`📸 ${name}...`)

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(delay)

      const screenshotPath = path.join(SCREENSHOT_DIR, `${name}.png`)
      await page.screenshot({ path: screenshotPath, fullPage: false })
      console.log(`   ✓ Saved ${name}.png`)
    } catch (e) {
      console.log(`   ✗ Failed: ${e.message}`)
    }
  }

  await browser.close()
  console.log(`\n✅ Done! Screenshots saved to ui/public/help/`)
}

main().catch(console.error)
