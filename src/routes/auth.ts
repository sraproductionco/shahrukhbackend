import { Router } from 'express'
import { ensureAdminSeeded, requireAuth, signAdminToken, verifyAdminLogin, type AuthedRequest } from '../services/auth.js'

export const authRouter = Router()

authRouter.post('/login', async (req, res) => {
  try {
    await ensureAdminSeeded()

    const email = String(req.body?.email ?? '').trim()
    const password = String(req.body?.password ?? '')

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' })
      return
    }

    const admin = await verifyAdminLogin(email, password)
    if (!admin) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const token = signAdminToken({ sub: admin.id, email: admin.email })
    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        displayName: admin.display_name,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Login failed' })
  }
})

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  res.json({
    admin: {
      id: req.admin?.sub,
      email: req.admin?.email,
    },
  })
})
