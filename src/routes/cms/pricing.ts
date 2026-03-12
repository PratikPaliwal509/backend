import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { authenticate, requireAdmin } from '../../middleware/auth.js'

const planSchema = z.object({
  name:         z.string().trim().min(1),
  monthlyPrice: z.number().min(0),
  yearlyPrice:  z.number().min(0),
  description:  z.string().trim().min(1),
  features:     z.array(z.string().trim().min(1)),
  ctaText:      z.string().trim().min(1),
  isPopular:    z.boolean().optional(),
  order:        z.number().int().optional(),
  isActive:     z.boolean().optional(),
})

const reorderSchema = z.array(z.object({ id: z.string(), order: z.number().int() }))

const parse = (p: { features: string; [k: string]: unknown }) => ({
  ...p, features: JSON.parse(p.features) as string[],
})

export const pricingRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_req, reply) => {
    const plans = await prisma.pricingPlan.findMany({
      where: { isActive: true }, orderBy: { order: 'asc' },
    })
    return reply.send({ plans: plans.map(parse) })
  })

  app.get('/all', { preHandler: [authenticate, requireAdmin] }, async (_req, reply) => {
    const plans = await prisma.pricingPlan.findMany({ orderBy: { order: 'asc' } })
    return reply.send({ plans: plans.map(parse) })
  })

  app.post('/', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const result = planSchema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: result.error.errors[0]?.message })
    const { features, ...rest } = result.data
    const count = await prisma.pricingPlan.count()
    const plan = await prisma.pricingPlan.create({
      data: { ...rest, features: JSON.stringify(features), order: rest.order ?? count },
    })
    return reply.code(201).send({ plan: parse(plan) })
  })

  app.patch('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const result = planSchema.partial().safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: result.error.errors[0]?.message })
    const { features, ...rest } = result.data
    const plan = await prisma.pricingPlan.update({
      where: { id },
      data: { ...rest, ...(features ? { features: JSON.stringify(features) } : {}) },
    })
    return reply.send({ plan: parse(plan) })
  })

  app.delete('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.pricingPlan.delete({ where: { id } })
    return reply.send({ success: true })
  })

  app.post('/reorder', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const result = reorderSchema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: 'Invalid reorder data' })
    await Promise.all(result.data.map(({ id, order }) =>
      prisma.pricingPlan.update({ where: { id }, data: { order } }),
    ))
    return reply.send({ success: true })
  })
}
