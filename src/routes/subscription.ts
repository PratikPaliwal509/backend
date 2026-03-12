import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import crypto from 'crypto'
import Razorpay from 'razorpay'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { cfg } from '../config.js'

const razorpay = new Razorpay({
  key_id:     cfg.razorpayKeyId,
  key_secret: cfg.razorpayKeySecret,
})

const PLAN_AMOUNTS: Record<string, number> = {
  MONTHLY_PRO:       2900 * 100, // ₹2900/mo in paise (₹29 * 100)
  YEARLY_PRO:        1900 * 12 * 100,
  MONTHLY_BUSINESS:  7900 * 100,
  YEARLY_BUSINESS:   5300 * 12 * 100,
}

const createOrderSchema = z.object({
  plan:    z.enum(['MONTHLY', 'YEARLY']),
  planKey: z.enum(['PRO', 'BUSINESS']),
})

const verifySchema = z.object({
  razorpayOrderId:   z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  plan:              z.enum(['MONTHLY', 'YEARLY']),
})

export const subscriptionRoutes: FastifyPluginAsync = async (app) => {

  // POST /api/subscription/create-order
  app.post('/create-order', { preHandler: authenticate }, async (req, reply) => {
    const result = createOrderSchema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: result.error.errors[0]?.message })

    const { plan, planKey } = result.data
    const amountKey = `${plan}_${planKey}` as keyof typeof PLAN_AMOUNTS
    const amount = PLAN_AMOUNTS[amountKey]
    if (!amount) return reply.code(400).send({ error: 'Invalid plan selection' })

    const receipt = `order_${req.user!.id}_${Date.now()}`
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt,
    })

    // Upsert pending subscription record
    await prisma.subscription.upsert({
      where:  { userId: req.user!.id },
      update: { plan, status: 'PENDING', amount, razorpayOrderId: order.id as string },
      create: {
        userId: req.user!.id,
        plan,
        status: 'PENDING',
        amount,
        razorpayOrderId: order.id as string,
      },
    })

    return reply.send({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    cfg.razorpayKeyId,
    })
  })

  // POST /api/subscription/verify
  app.post('/verify', { preHandler: authenticate }, async (req, reply) => {
    const result = verifySchema.safeParse(req.body)
    if (!result.success) return reply.code(400).send({ error: result.error.errors[0]?.message })

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan } = result.data

    // Verify HMAC signature
    const body = `${razorpayOrderId}|${razorpayPaymentId}`
    const expected = crypto
      .createHmac('sha256', cfg.razorpayKeySecret)
      .update(body)
      .digest('hex')

    if (expected !== razorpaySignature) {
      return reply.code(400).send({ error: 'Invalid payment signature' })
    }

    // Calculate expiry
    const now = new Date()
    const expiresAt = new Date(now)
    if (plan === 'MONTHLY') expiresAt.setMonth(expiresAt.getMonth() + 1)
    else expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    const subscription = await prisma.subscription.update({
      where:  { userId: req.user!.id },
      data:   {
        status:            'ACTIVE',
        razorpayPaymentId,
        razorpaySignature,
        startsAt:          now,
        expiresAt,
      },
    })

    return reply.send({ success: true, subscription })
  })

  // GET /api/subscription/status
  app.get('/status', { preHandler: authenticate }, async (req, reply) => {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user!.id },
    })
    return reply.send({ subscription })
  })

  // POST /api/subscription/webhook — Razorpay webhook
  app.post('/webhook', async (req, reply) => {
    const signature = req.headers['x-razorpay-signature'] as string
    if (!signature) return reply.code(400).send({ error: 'Missing signature' })

    const body = JSON.stringify(req.body)
    const expected = crypto
      .createHmac('sha256', cfg.razorpayWebhookSecret)
      .update(body)
      .digest('hex')

    if (expected !== signature) {
      return reply.code(400).send({ error: 'Invalid webhook signature' })
    }

    const event = req.body as { event: string; payload?: { payment?: { entity?: { order_id?: string } } } }

    if (event.event === 'payment.failed') {
      const orderId = event.payload?.payment?.entity?.order_id
      if (orderId) {
        await prisma.subscription.updateMany({
          where: { razorpayOrderId: orderId },
          data:  { status: 'CANCELLED' },
        }).catch(() => {}) // non-critical
      }
    }

    return reply.send({ received: true })
  })
}
