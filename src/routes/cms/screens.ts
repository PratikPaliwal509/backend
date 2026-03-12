import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { authenticate, requireAdmin } from '../../middleware/auth.js'

const schema = z.object({
  title:    z.string().trim().min(1),
  imageUrl: z.string().trim().url('Must be a valid URL'),
  altText:  z.string().trim().min(1),
  order:    z.number().int().optional(),
  isActive: z.boolean().optional(),
})

const reorderSchema = z.array(z.object({ id: z.string(), order: z.number().int() }))

export const screensRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_req, reply) => {
    const screens = await prisma.appScreen.findMany({
      where: { isActive: true }, orderBy: { order: 'asc' },
    })
    return reply.send({ screens })
  })

  app.get('/all', { preHandler: [authenticate, requireAdmin] }, async (_req, reply) => {
    const screens = await prisma.appScreen.findMany({ orderBy: { order: 'asc' } })
    return reply.send({ screens })
  })

  app.post('/', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const result = schema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: result.error.errors[0]?.message })
    const count = await prisma.appScreen.count()
    const screen = await prisma.appScreen.create({
      data: { ...result.data, order: result.data.order ?? count },
    })
    return reply.code(201).send({ screen })
  })

  app.patch('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const result = schema.partial().safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: result.error.errors[0]?.message })
    const screen = await prisma.appScreen.update({ where: { id }, data: result.data })
    return reply.send({ screen })
  })

  app.delete('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.appScreen.delete({ where: { id } })
    return reply.send({ success: true })
  })

  app.post('/reorder', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const result = reorderSchema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: 'Invalid reorder data' })
    await Promise.all(result.data.map(({ id, order }) =>
      prisma.appScreen.update({ where: { id }, data: { order } }),
    ))
    return reply.send({ success: true })
  })
}
