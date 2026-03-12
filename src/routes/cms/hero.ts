import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { authenticate, requireAdmin } from '../../middleware/auth.js'

const heroSchema = z.object({
  badge:        z.string().trim().min(1).optional(),
  headline:     z.string().trim().min(1).optional(),
  subheadline:  z.string().trim().min(1).optional(),
  primaryCta:   z.string().trim().min(1).optional(),
  secondaryCta: z.string().trim().min(1).optional(),
  bookDemoCta:  z.string().trim().min(1).optional(),
})

export const heroRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/cms/hero — public
  app.get('/', async (_req, reply) => {
    const hero = await prisma.heroSection.findFirst()
    return reply.send({ hero })
  })

  // PATCH /api/cms/hero — admin only
  app.patch('/', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const result = heroSchema.safeParse(req.body)
    if (!result.success) {
      return reply.code(400).send({ error: result.error.errors[0]?.message })
    }

    const existing = await prisma.heroSection.findFirst()
    let hero
    if (existing) {
      hero = await prisma.heroSection.update({ where: { id: existing.id }, data: result.data })
    } else {
      // Create with defaults if not exists
      const data = result.data as Parameters<typeof prisma.heroSection.create>[0]['data']
      hero = await prisma.heroSection.create({ data })
    }
    return reply.send({ hero })
  })
}
