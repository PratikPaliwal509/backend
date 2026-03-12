import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccess, type TokenPayload } from '../lib/jwt.js'

// Augment FastifyRequest to carry user info
declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; email: string; role: string }
  }
}

export async function authenticate(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing authorization header' })
  }
  const token = authHeader.replace('Bearer ', '')
  try {
    const payload = verifyAccess(token) as TokenPayload
    req.user = { id: payload.sub, email: payload.email, role: payload.role }
  } catch {
    return reply.code(401).send({ error: 'Invalid or expired token' })
  }
}

export async function requireAdmin(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (req.user?.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Admin access required' })
  }
}
