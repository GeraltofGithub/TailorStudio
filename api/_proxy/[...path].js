/**
 * Vercel serverless proxy to backend (repo-root).
 *
 * CommonJS export keeps compatibility with Vercel Node runtime
 * even when the repo isn't configured as ESM.
 *
 * Vercel env:
 * - BACKEND_URL=https://<your-render-service>.onrender.com
 */
module.exports = async function handler(req, res) {
  const base = (process.env.BACKEND_URL || process.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
  if (!base) {
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'BACKEND_URL is not configured' }))
    return
  }

  const pathParts = req.query?.path || []
  const tail = Array.isArray(pathParts) ? pathParts.join('/') : String(pathParts || '')
  const qsIdx = req.url ? req.url.indexOf('?') : -1
  const qs = qsIdx >= 0 ? req.url.slice(qsIdx) : ''

  const targetUrl = `${base}/${tail}${qs}`

  const headers = { ...req.headers }
  delete headers.host
  delete headers.connection

  const method = req.method || 'GET'
  const hasBody = !['GET', 'HEAD'].includes(method.toUpperCase())
  const body = hasBody ? await readBody(req) : undefined

  const r = await fetch(targetUrl, { method, headers, body, redirect: 'manual' })

  res.statusCode = r.status
  r.headers.forEach((v, k) => {
    if (k.toLowerCase() === 'content-length') return
    res.setHeader(k, v)
  })

  const buf = Buffer.from(await r.arrayBuffer())
  res.end(buf)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

