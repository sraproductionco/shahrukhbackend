import { Router } from 'express'
import { aboutRouter } from './about.js'
import { authRouter } from './auth.js'
import { categoriesRouter } from './categories.js'
import { healthRouter } from './health.js'
import { heroRouter } from './hero.js'
import { mediaRouter } from './media.js'
import { projectsRouter } from './projects.js'
import { servicesRouter } from './services.js'
import { uploadsRouter } from './uploads.js'

export const apiRouter = Router()

apiRouter.use('/health', healthRouter)
apiRouter.use('/auth', authRouter)
apiRouter.use('/categories', categoriesRouter)
apiRouter.use('/projects', projectsRouter)
apiRouter.use('/uploads', uploadsRouter)
apiRouter.use('/media', mediaRouter)
apiRouter.use('/hero', heroRouter)
apiRouter.use('/services', servicesRouter)
apiRouter.use('/about', aboutRouter)

apiRouter.get('/', (_req, res) => {
  res.json({
    message: 'Video editor portfolio API — Phase 2',
    endpoints: {
      health: 'GET /api/health',
      login: 'POST /api/auth/login',
      categories: 'GET|POST /api/categories',
      projects: 'GET /api/projects',
      uploads: 'POST /api/uploads/presign',
      media: 'GET /api/media?key=',
      hero: 'GET|PUT /api/hero',
      services: 'GET|POST /api/services',
      about: 'GET /api/about | PUT /api/about/profile',
    },
  })
})
