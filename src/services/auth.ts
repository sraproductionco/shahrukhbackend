import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'
import { env } from '../config/env.js'
import { getSupabase } from '../config/supabase.js'

export type AdminTokenPayload = {
  sub: string
  email: string
}

export type AuthedRequest = Request & {
  admin?: AdminTokenPayload
}

const TOKEN_TTL = '7d'

export async function ensureAdminSeeded() {
  if (!env.adminEmail || !env.adminPassword) return

  const supabase = getSupabase()
  const { data: existing, error } = await supabase
    .from('admins')
    .select('id')
    .eq('email', env.adminEmail.toLowerCase())
    .maybeSingle()

  if (error) {
    console.warn('Admin seed check failed:', error.message)
    return
  }

  if (existing) return

  const password_hash = await bcrypt.hash(env.adminPassword, 10)
  const { error: insertError } = await supabase.from('admins').insert({
    email: env.adminEmail.toLowerCase(),
    password_hash,
    display_name: 'Admin',
  })

  if (insertError) {
    console.warn('Admin seed insert failed:', insertError.message)
  } else {
    console.log(`Seeded admin account for ${env.adminEmail}`)
  }
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: TOKEN_TTL })
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const token = header.slice(7)
    const decoded = jwt.verify(token, env.jwtSecret) as AdminTokenPayload
    req.admin = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export async function verifyAdminLogin(email: string, password: string) {
  const supabase = getSupabase()
  const { data: admin, error } = await supabase
    .from('admins')
    .select('id, email, password_hash, display_name')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (error || !admin) {
    return null
  }

  const ok = await bcrypt.compare(password, admin.password_hash)
  if (!ok) return null

  return {
    id: admin.id as string,
    email: admin.email as string,
    display_name: admin.display_name as string | null,
  }
}
