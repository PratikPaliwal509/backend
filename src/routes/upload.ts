import type { FastifyPluginAsync } from 'fastify'
import { createWriteStream, mkdirSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const UPLOADS_DIR = join(__dirname, '../../uploads')

// Ensure uploads dir exists
mkdirSync(UPLOADS_DIR, { recursive: true })

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file uploaded' })

    if (!ALLOWED_TYPES.includes(data.mimetype)) {
      return reply.code(400).send({ error: 'File type not allowed. Use JPEG, PNG, WebP, GIF, or SVG.' })
    }

    const ext = extname(data.filename) || '.jpg'
    const filename = `${randomUUID()}${ext}`
    const filepath = join(UPLOADS_DIR, filename)

    // Stream file to disk
    let size = 0
    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      size += chunk.length
      if (size > MAX_SIZE) {
        return reply.code(400).send({ error: 'File too large. Max 5MB.' })
      }
      chunks.push(chunk)
    }

    const writeStream = createWriteStream(filepath)
    writeStream.write(Buffer.concat(chunks))
    await new Promise<void>((res, rej) => {
      writeStream.end()
      writeStream.on('finish', res)
      writeStream.on('error', rej)
    })

    const url = `/uploads/${filename}`
    return reply.code(201).send({ url, filename })
  })
}
