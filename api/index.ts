import type { VercelRequest, VercelResponse } from '@vercel/node'
import app, { bootstrap } from '../src/app.js'

const ready = bootstrap()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ready
  return app(req, res)
}
