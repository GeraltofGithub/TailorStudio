import type { Request, Response, NextFunction, RequestHandler } from 'express'
import type { AuthedRequest } from '../middleware/auth.js'

export function ah(fn: (req: AuthedRequest, res: Response) => unknown): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as AuthedRequest, res)).catch(next)
  }
}
