import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { hashPassword, comparePassword } from '../lib/hash.js'
import { signAccess, signRefresh, verifyRefresh, type TokenPayload } from '../lib/jwt.js'
import { authenticate } from '../middleware/auth.js'

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export const authRoutes: FastifyPluginAsync = async (app) => {

  // POST /api/auth/register
  app.post('/register', async (req, reply) => {
    const result = registerSchema.safeParse(req.body)
    if (!result.success) {
      return reply.code(400).send({ error: result.error.errors[0]?.message })
    }
    const { name, email, password } = result.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.code(409).send({ error: 'Email already registered' })
    }

    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: 'USER' },
      select: { id: true, email: true, name: true, role: true },
    })

    const [accessToken, refreshToken] = await Promise.all([
      signAccess({ sub: user.id, email: user.email, role: user.role, type: 'access' }),
      signRefresh({ sub: user.id, email: user.email, role: user.role, type: 'refresh' }),
    ])

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await prisma.session.create({ data: { userId: user.id, refreshToken, expiresAt } })

    return reply.code(201).send({ accessToken, refreshToken, user })
  })

  // POST /api/auth/login
  app.post('/login', async (req, reply) => {
    const result = loginSchema.safeParse(req.body)
    if (!result.success) {
      return reply.code(400).send({ error: 'Invalid email or password' })
    }
    const { email, password } = result.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return reply.code(401).send({ error: 'Invalid credentials' })

    const valid = await comparePassword(password, user.passwordHash)
    if (!valid) return reply.code(401).send({ error: 'Invalid credentials' })

    // Invalidate old sessions
    await prisma.session.deleteMany({ where: { userId: user.id } })

    const [accessToken, refreshToken] = await Promise.all([
      signAccess({ sub: user.id, email: user.email, role: user.role, type: 'access' }),
      signRefresh({ sub: user.id, email: user.email, role: user.role, type: 'refresh' }),
    ])

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await prisma.session.create({ data: { userId: user.id, refreshToken, expiresAt } })

    return reply.send({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
  })

  // POST /api/auth/refresh
  app.post('/refresh', async (req, reply) => {
    const result = refreshSchema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: 'Refresh token required' })

    const { refreshToken } = result.data
    let payload: TokenPayload
    try {
      payload = verifyRefresh(refreshToken) as TokenPayload
    } catch {
      return reply.code(401).send({ error: 'Invalid refresh token' })
    }

    const session = await prisma.session.findUnique({ where: { refreshToken } })
    if (!session || session.expiresAt < new Date()) {
      return reply.code(401).send({ error: 'Session expired' })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true },
    })
    if (!user) return reply.code(401).send({ error: 'User not found' })

    const newAccess = await signAccess({
      sub: user.id, email: user.email, role: user.role, type: 'access',
    })

    return reply.send({ accessToken: newAccess, user })
  })

  // POST /api/auth/logout
  app.post('/logout', { preHandler: authenticate }, async (req, reply) => {
    await prisma.session.deleteMany({ where: { userId: req.user!.id } })
    return reply.send({ success: true })
  })

  // GET /api/auth/me
  app.get('/me', { preHandler: authenticate }, async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })
    if (!user) return reply.code(404).send({ error: 'User not found' })
    return reply.send({ user })
  })
}
