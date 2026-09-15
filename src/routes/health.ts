import { Router } from 'express'
import { hasB2Config, hasSupabaseConfig } from '../config/env.js'

export const healthRouter = Router()

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'shahrukhbackend',
    timestamp: new Date().toISOString(),
    integrations: {
      supabase: hasSupabaseConfig() ? 'configured' : 'missing_env',
      backblazeB2: hasB2Config() ? 'configured' : 'missing_env',
    },
  })
})
