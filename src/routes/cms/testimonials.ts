import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { authenticate, requireAdmin } from '../../middleware/auth.js'

const schema = z.object({
  name:      z.string().trim().min(1),
  role:      z.string().trim().min(1),
  company:   z.string().trim().min(1),
  quote:     z.string().trim().min(1),
  initials:  z.string().trim().min(1).max(3),
  cardColor: z.enum(['green', 'cyan', 'blue', 'purple']),
  order:     z.number().int().optional(),
  isActive:  z.boolean().optional(),
})

const reorderSchema = z.array(z.object({ id: z.string(), order: z.number().int() }))

export const testimonialRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_req, reply) => {
    const testimonials = await prisma.testimonial.findMany({
      where: { isActive: true }, orderBy: { order: 'asc' },
    })
    return reply.send({ testimonials })
  })

  app.get('/all', { preHandler: [authenticate, requireAdmin] }, async (_req, reply) => {
    const testimonials = await prisma.testimonial.findMany({ orderBy: { order: 'asc' } })
    return reply.send({ testimonials })
  })

  app.post('/', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const result = schema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: result.error.errors[0]?.message })
    const count = await prisma.testimonial.count()
    const t = await prisma.testimonial.create({
      data: { ...result.data, order: result.data.order ?? count },
    })
    return reply.code(201).send({ testimonial: t })
  })

  app.patch('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const result = schema.partial().safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: result.error.errors[0]?.message })
    const t = await prisma.testimonial.update({ where: { id }, data: result.data })
    return reply.send({ testimonial: t })
  })

  app.delete('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.testimonial.delete({ where: { id } })
    return reply.send({ success: true })
  })

  app.post('/reorder', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const result = reorderSchema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: 'Invalid reorder data' })
    await Promise.all(result.data.map(({ id, order }) =>
      prisma.testimonial.update({ where: { id }, data: { order } }),
    ))
    return reply.send({ success: true })
  })
}
