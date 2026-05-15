/**
 * Start API:  node start.mjs
 * Do NOT use: node src/server.ts  (TypeScript — needs tsx)
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const entry = path.join(root, 'src', 'server.ts')

const r = spawnSync(process.execPath, ['--import', 'tsx', entry], {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
})

process.exit(r.status === null ? 1 : r.status)
