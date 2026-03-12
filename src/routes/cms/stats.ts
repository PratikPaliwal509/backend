import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { authenticate, requireAdmin } from '../../middleware/auth.js'

const schema = z.object({
  value: z.string().trim().min(1),
  label: z.string().trim().min(1),
  order: z.number().int().optional(),
})

const reorderSchema = z.array(z.object({ id: z.string(), order: z.number().int() }))

export const statsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_req, reply) => {
    const stats = await prisma.stat.findMany({ orderBy: { order: 'asc' } })
    return reply.send({ stats })
  })

  app.post('/', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const result = schema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: result.error.errors[0]?.message })
    const count = await prisma.stat.count()
    const stat = await prisma.stat.create({
      data: { ...result.data, order: result.data.order ?? count },
    })
    return reply.code(201).send({ stat })
  })

  app.patch('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const result = schema.partial().safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: result.error.errors[0]?.message })
    const stat = await prisma.stat.update({ where: { id }, data: result.data })
    return reply.send({ stat })
  })

  app.delete('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.stat.delete({ where: { id } })
    return reply.send({ success: true })
  })

  app.post('/reorder', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const result = reorderSchema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: 'Invalid reorder data' })
    await Promise.all(result.data.map(({ id, order }) =>
      prisma.stat.update({ where: { id }, data: { order } }),
    ))
    return reply.send({ success: true })
  })
}
