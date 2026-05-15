import express from 'express'
import compression from 'compression'
import { corsMiddleware } from './config/cors.js'
import routes from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1)
  }
  app.use(corsMiddleware)
  app.use(compression())
  app.use(express.json({ limit: '2mb' }))
  app.use(routes)
  app.use(errorHandler)
  return app
}
