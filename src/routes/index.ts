import type { FastifyInstance } from 'fastify'
import { authRoutes }         from './auth.js'
import { cmsRoutes }          from './cms/index.js'
import { subscriptionRoutes } from './subscription.js'
import { adminRoutes }        from './admin.js'
import { uploadRoutes }       from './upload.js'

export async function registerRoutes(app: FastifyInstance) {
  app.register(authRoutes,         { prefix: '/api/auth' })
  app.register(cmsRoutes,          { prefix: '/api/cms' })
  app.register(subscriptionRoutes, { prefix: '/api/subscription' })
  app.register(adminRoutes,        { prefix: '/api/admin' })
  app.register(uploadRoutes,       { prefix: '/api/upload' })
}
