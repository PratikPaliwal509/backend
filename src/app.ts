import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync } from 'fs'
import { cfg } from './config.js'
import { registerRoutes } from './routes/index.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: cfg.isDev ? 'info' : 'warn',
      transport: cfg.isDev
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
        : undefined,
    },
  })

  // ── CORS ────────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: [cfg.frontendUrl, 'http://localhost:5173', 'http://localhost:4301'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // ── Multipart (file uploads) ─────────────────────────────────────────────────
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  })

  // ── Static uploads ──────────────────────────────────────────────────────────
  await app.register(staticFiles, {
    root:       join(__dirname, '../uploads'),
    prefix:     '/uploads/',
    decorateReply: false,
  })

  // ── Serve frontend dist (SPA) — only when built locally ─────────────────────
  const frontendDist = join(__dirname, '../../frontend/dist')
  const indexHtmlPath = join(frontendDist, 'index.html')
  const hasDist = existsSync(indexHtmlPath)
  const indexHtml = hasDist ? readFileSync(indexHtmlPath, 'utf-8') : ''

  if (hasDist) {
    await app.register(staticFiles, {
      root:          frontendDist,
      prefix:        '/',
      wildcard:      false,
      decorateReply: false,
      index:         false,
    })
  }

  // ── Health check ─────────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // ── Routes ──────────────────────────────────────────────────────────────────
  await registerRoutes(app)

  // ── SPA fallback ─────────────────────────────────────────────────────────────
  app.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith('/api/') || req.url.startsWith('/uploads/')) {
      return reply.status(404).send({ error: 'Not found' })
    }
    if (hasDist) return reply.type('text/html').send(indexHtml)
    return reply.status(404).send({ error: 'Not found' })
  })

  return app
}
