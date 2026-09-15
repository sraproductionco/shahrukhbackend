import { Router } from 'express'
import { authRouter } from './auth.js'
import { categoriesRouter } from './categories.js'
import { healthRouter } from './health.js'
import { projectsRouter } from './projects.js'
import { uploadsRouter } from './uploads.js'

export const apiRouter = Router()

apiRouter.use('/health', healthRouter)
apiRouter.use('/auth', authRouter)
apiRouter.use('/categories', categoriesRouter)
apiRouter.use('/projects', projectsRouter)
apiRouter.use('/uploads', uploadsRouter)

apiRouter.get('/', (_req, res) => {
  res.json({
    message: 'Video editor portfolio API — Phase 2',
    endpoints: {
      health: 'GET /api/health',
      login: 'POST /api/auth/login',
      categories: 'GET|POST /api/categories',
      projects: 'GET /api/projects',
      uploads: 'POST /api/uploads/presign',
    },
  })
})
