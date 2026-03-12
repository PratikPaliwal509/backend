import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { authenticate, requireAdmin } from '../../middleware/auth.js'

const featureSchema = z.object({
  title:       z.string().trim().min(1),
  description: z.string().trim().min(1),
  bullets:     z.array(z.string().trim().min(1)).min(1),
  iconName:    z.string().trim().min(1),
  order:       z.number().int().optional(),
  isActive:    z.boolean().optional(),
})

const reorderSchema = z.array(z.object({ id: z.string(), order: z.number().int() }))

export const featureRoutes: FastifyPluginAsync = async (app) => {
  // GET — public
  app.get('/', async (_req, reply) => {
    const features = await prisma.feature.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    })
    return reply.send({ features: features.map(f => ({ ...f, bullets: JSON.parse(f.bullets) })) })
  })

  // GET all (admin — includes inactive)
  app.get('/all', { preHandler: [authenticate, requireAdmin] }, async (_req, reply) => {
    const features = await prisma.feature.findMany({ orderBy: { order: 'asc' } })
    return reply.send({ features: features.map(f => ({ ...f, bullets: JSON.parse(f.bullets) })) })
  })

  // POST — admin
  app.post('/', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const result = featureSchema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: result.error.errors[0]?.message })
    const { bullets, ...rest } = result.data
    const count = await prisma.feature.count()
    const feature = await prisma.feature.create({
      data: { ...rest, bullets: JSON.stringify(bullets), order: rest.order ?? count },
    })
    return reply.code(201).send({ feature: { ...feature, bullets: JSON.parse(feature.bullets) } })
  })

  // PATCH /:id — admin
  app.patch('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const result = featureSchema.partial().safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: result.error.errors[0]?.message })
    const { bullets, ...rest } = result.data
    const feature = await prisma.feature.update({
      where: { id },
      data: { ...rest, ...(bullets ? { bullets: JSON.stringify(bullets) } : {}) },
    })
    return reply.send({ feature: { ...feature, bullets: JSON.parse(feature.bullets) } })
  })

  // DELETE /:id — admin
  app.delete('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.feature.delete({ where: { id } })
    return reply.send({ success: true })
  })

  // POST /reorder — admin
  app.post('/reorder', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const result = reorderSchema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: 'Invalid reorder data' })
    await Promise.all(result.data.map(({ id, order }) =>
      prisma.feature.update({ where: { id }, data: { order } }),
    ))
    return reply.send({ success: true })
  })
}
