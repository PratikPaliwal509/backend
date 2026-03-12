import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const guard = [authenticate, requireAdmin]

export const adminRoutes: FastifyPluginAsync = async (app) => {

  // GET /api/admin/dashboard
  app.get('/dashboard', { preHandler: guard }, async (_req, reply) => {
    const [totalUsers, activeSubs, allSubs] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.findMany({ where: { status: 'ACTIVE' } }),
    ])

    // Revenue: sum of amounts in paise → convert to INR
    const revenueInPaise = allSubs.reduce((sum, s) => sum + s.amount, 0)
    const revenueInr = Math.round(revenueInPaise / 100)

    return reply.send({
      stats: {
        totalUsers,
        activeSubs,
        totalRevenue: revenueInr,
        mrr: activeSubs * 2900, // average monthly estimate
      },
    })
  })

  // GET /api/admin/subscriptions
  app.get('/subscriptions', { preHandler: guard }, async (req, reply) => {
    const page  = Number((req.query as { page?: string }).page  ?? 1)
    const limit = Number((req.query as { limit?: string }).limit ?? 20)

    const [total, subscriptions] = await Promise.all([
      prisma.subscription.count(),
      prisma.subscription.findMany({
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, name: true } } },
      }),
    ])

    return reply.send({ subscriptions, total, page, limit })
  })

  // GET /api/admin/users
  app.get('/users', { preHandler: guard }, async (req, reply) => {
    const page  = Number((req.query as { page?: string }).page  ?? 1)
    const limit = Number((req.query as { limit?: string }).limit ?? 20)

    const [total, users] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.findMany({
        where:   { role: 'USER' },
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        select:  {
          id: true, email: true, name: true, createdAt: true,
          subscription: { select: { status: true, plan: true, expiresAt: true } },
        },
      }),
    ])

    return reply.send({ users, total, page, limit })
  })
}
