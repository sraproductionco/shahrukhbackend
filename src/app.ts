import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env, hasSupabaseConfig } from './config/env.js'
import { apiRouter } from './routes/index.js'
import { ensureAdminSeeded } from './services/auth.js'

const app = express()

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(
  cors({
    origin:
      env.corsOrigin === '*'
        ? true
        : env.corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: env.corsOrigin !== '*',
  }),
)
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/', (_req, res) => {
  res.json({
    name: 'shahrukhbackend',
    phase: 2,
    docs: 'See README.md',
  })
})

app.use('/api', apiRouter)

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err)
    res.status(500).json({
      error: env.nodeEnv === 'production' ? 'Internal server error' : err.message,
    })
  },
)

export async function bootstrap() {
  if (hasSupabaseConfig()) {
    try {
      await ensureAdminSeeded()
    } catch (err) {
      console.warn('Admin seed skipped:', err)
    }
  }
}

export default app
