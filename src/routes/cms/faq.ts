import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { authenticate, requireAdmin } from '../../middleware/auth.js'

const schema = z.object({
  question: z.string().trim().min(1),
  answer:   z.string().trim().min(1),
  order:    z.number().int().optional(),
  isActive: z.boolean().optional(),
})

const reorderSchema = z.array(z.object({ id: z.string(), order: z.number().int() }))

export const faqRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_req, reply) => {
    const items = await prisma.faqItem.findMany({
      where: { isActive: true }, orderBy: { order: 'asc' },
    })
    return reply.send({ faq: items })
  })

  app.get('/all', { preHandler: [authenticate, requireAdmin] }, async (_req, reply) => {
    const items = await prisma.faqItem.findMany({ orderBy: { order: 'asc' } })
    return reply.send({ faq: items })
  })

  app.post('/', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const result = schema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: result.error.errors[0]?.message })
    const count = await prisma.faqItem.count()
    const item = await prisma.faqItem.create({
      data: { ...result.data, order: result.data.order ?? count },
    })
    return reply.code(201).send({ item })
  })

  app.patch('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const result = schema.partial().safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: result.error.errors[0]?.message })
    const item = await prisma.faqItem.update({ where: { id }, data: result.data })
    return reply.send({ item })
  })

  app.delete('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.faqItem.delete({ where: { id } })
    return reply.send({ success: true })
  })

  app.post('/reorder', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const result = reorderSchema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: 'Invalid reorder data' })
    await Promise.all(result.data.map(({ id, order }) =>
      prisma.faqItem.update({ where: { id }, data: { order } }),
    ))
    return reply.send({ success: true })
  })
}
