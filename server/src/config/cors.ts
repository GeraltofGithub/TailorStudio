import cors from 'cors'
import type { CorsOptions } from 'cors'
import { env } from './env.js'

const VERCEL_PREVIEW = /^https:\/\/[\w.-]+\.vercel\.app$/i

function isAllowedOrigin(origin: string): boolean {
  if (env.corsOrigins.includes(origin)) return true
  if (env.allowVercelPreviews && VERCEL_PREVIEW.test(origin)) return true
  return false
}

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // No Origin: same-origin, curl, Render health checks, some native clients
    if (!origin) {
      callback(null, true)
      return
    }
    if (isAllowedOrigin(origin)) {
      callback(null, true)
      return
    }
    if (env.isDev) {
      console.warn(`[cors] blocked origin: ${origin}`)
    }
    callback(null, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Location'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
}

export const corsMiddleware = cors(corsOptions)
