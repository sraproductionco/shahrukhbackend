import { Router } from 'express'
import { healthRouter } from './health.js'

export const apiRouter = Router()

apiRouter.use('/health', healthRouter)

// Phase 2: /categories, /projects, /admin/auth, /uploads
apiRouter.get('/', (_req, res) => {
  res.json({
    message: 'Video editor portfolio API — Phase 1 ready',
    endpoints: {
      health: 'GET /api/health',
    },
  })
})
