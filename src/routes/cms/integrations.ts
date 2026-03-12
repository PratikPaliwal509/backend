import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { authenticate, requireAdmin } from '../../middleware/auth.js'

const schema = z.object({
  name:     z.string().trim().min(1),
  iconType: z.enum(['google', 'outlook', 'teams', 'slack', 'zoom', 'custom']),
  isActive: z.boolean().optional(),
  order:    z.number().int().optional(),
})

const reorderSchema = z.array(z.object({ id: z.string(), order: z.number().int() }))

export const integrationRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_req, reply) => {
    const integrations = await prisma.integration.findMany({
      where: { isActive: true }, orderBy: { order: 'asc' },
    })
    return reply.send({ integrations })
  })

  app.get('/all', { preHandler: [authenticate, requireAdmin] }, async (_req, reply) => {
    const integrations = await prisma.integration.findMany({ orderBy: { order: 'asc' } })
    return reply.send({ integrations })
  })

  app.post('/', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const result = schema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: result.error.errors[0]?.message })
    const count = await prisma.integration.count()
    const item = await prisma.integration.create({
      data: { ...result.data, order: result.data.order ?? count },
    })
    return reply.code(201).send({ integration: item })
  })

  app.patch('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const result = schema.partial().safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: result.error.errors[0]?.message })
    const item = await prisma.integration.update({ where: { id }, data: result.data })
    return reply.send({ integration: item })
  })

  app.delete('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.integration.delete({ where: { id } })
    return reply.send({ success: true })
  })

  app.post('/reorder', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const result = reorderSchema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: 'Invalid reorder data' })
    await Promise.all(result.data.map(({ id, order }) =>
      prisma.integration.update({ where: { id }, data: { order } }),
    ))
    return reply.send({ success: true })
  })
}
