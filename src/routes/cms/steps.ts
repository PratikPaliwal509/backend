import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { authenticate, requireAdmin } from '../../middleware/auth.js'

const schema = z.object({
  stepNumber:  z.number().int().min(1),
  title:       z.string().trim().min(1),
  description: z.string().trim().min(1),
  colorClass:  z.string().trim().min(1),
  order:       z.number().int().optional(),
})

const reorderSchema = z.array(z.object({ id: z.string(), order: z.number().int() }))

export const stepsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_req, reply) => {
    const steps = await prisma.howItWorksStep.findMany({ orderBy: { order: 'asc' } })
    return reply.send({ steps })
  })

  app.post('/', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const result = schema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: result.error.errors[0]?.message })
    const count = await prisma.howItWorksStep.count()
    const step = await prisma.howItWorksStep.create({
      data: { ...result.data, order: result.data.order ?? count },
    })
    return reply.code(201).send({ step })
  })

  app.patch('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const result = schema.partial().safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: result.error.errors[0]?.message })
    const step = await prisma.howItWorksStep.update({ where: { id }, data: result.data })
    return reply.send({ step })
  })

  app.delete('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.howItWorksStep.delete({ where: { id } })
    return reply.send({ success: true })
  })

  app.post('/reorder', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const result = reorderSchema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: 'Invalid reorder data' })
    await Promise.all(result.data.map(({ id, order }) =>
      prisma.howItWorksStep.update({ where: { id }, data: { order } }),
    ))
    return reply.send({ success: true })
  })
}
