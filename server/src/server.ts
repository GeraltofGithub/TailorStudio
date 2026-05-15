import http from 'http'
import { env } from './config/env.js'
import { connectDatabase } from './config/database.js'
import { createApp } from './app.js'
import { attachWebSocket } from './ws/socketServer.js'
import { startReminderJob } from './jobs/reminder.js'

async function main() {
  await connectDatabase()
  const app = createApp()
  const server = http.createServer(app)
  attachWebSocket(server)
  startReminderJob()
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `[server] Port ${env.port} is already in use. Stop the other process or change PORT in server/.env`,
      )
      process.exit(1)
    }
    throw err
  })
  server.listen(env.port, '0.0.0.0', () => {
    console.log(`[server] listening on 0.0.0.0:${env.port}  ws://0.0.0.0:${env.port}/ws`)
    if (env.corsOrigins.length) console.log(`[cors] allowed origins: ${env.corsOrigins.join(', ')}`)
    if (env.allowVercelPreviews) console.log('[cors] Vercel preview URLs (*.vercel.app) allowed')
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
