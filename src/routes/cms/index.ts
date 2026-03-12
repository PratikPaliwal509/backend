import type { FastifyPluginAsync } from 'fastify'
import { heroRoutes }        from './hero.js'
import { featureRoutes }     from './features.js'
import { integrationRoutes } from './integrations.js'
import { stepsRoutes }       from './steps.js'
import { testimonialRoutes } from './testimonials.js'
import { pricingRoutes }     from './pricing.js'
import { screensRoutes }     from './screens.js'
import { statsRoutes }       from './stats.js'
import { faqRoutes }         from './faq.js'

export const cmsRoutes: FastifyPluginAsync = async (app) => {
  app.register(heroRoutes,        { prefix: '/hero' })
  app.register(featureRoutes,     { prefix: '/features' })
  app.register(integrationRoutes, { prefix: '/integrations' })
  app.register(stepsRoutes,       { prefix: '/steps' })
  app.register(testimonialRoutes, { prefix: '/testimonials' })
  app.register(pricingRoutes,     { prefix: '/pricing' })
  app.register(screensRoutes,     { prefix: '/screens' })
  app.register(statsRoutes,       { prefix: '/stats' })
  app.register(faqRoutes,         { prefix: '/faq' })
}
