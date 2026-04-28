/**
 * Vercel serverless proxy to backend.
 *
 * Why: Vercel frontend and Render backend are different domains. If the browser calls Render directly,
 * session cookies become cross-site and login/session can fail. Proxying keeps requests same-origin
 * (to the Vercel domain) so cookies behave like local.
 *
 * Configure in Vercel project env:
 * - BACKEND_URL=https://<your-render-service>.onrender.com
 *
 * (Fallback: VITE_API_BASE_URL is also accepted, but BACKEND_URL is preferred.)
 */

module.exports = async function handler(req, res) {
  const base = (process.env.BACKEND_URL || process.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
  if (!base) {
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'BACKEND_URL is not configured' }))
    return
  }

  const pathParts = (req.query?.path || [])
  const tail = Array.isArray(pathParts) ? pathParts.join('/') : String(pathParts || '')
  const qsIdx = req.url ? req.url.indexOf('?') : -1
  const qs = qsIdx >= 0 ? req.url.slice(qsIdx) : ''

  const targetUrl = `${base}/${tail}${qs}`

  // Forward most headers, but avoid host/connection issues.
  const headers = { ...req.headers }
  delete headers.host
  delete headers.connection

  // Node request stream -> fetch body (for POST/PUT/etc)
  const method = req.method || 'GET'
  const hasBody = !['GET', 'HEAD'].includes(method.toUpperCase())
  const body = hasBody ? await readBody(req) : undefined

  const r = await fetch(targetUrl, {
    method,
    headers,
    body,
    redirect: 'manual',
  })

  res.statusCode = r.status

  // Copy headers (including set-cookie)
  r.headers.forEach((v, k) => {
    const key = k.toLowerCase()
    // let Vercel/Node handle content-length automatically
    if (key === 'content-length') return
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

