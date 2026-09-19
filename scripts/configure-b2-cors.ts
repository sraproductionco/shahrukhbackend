import 'dotenv/config'
import { configureBucketCors } from '../src/services/storage.ts'

const origins = (
  process.env.CORS_ORIGIN || 'http://localhost:5173'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

// Always allow local + production frontend
const allowed = Array.from(
  new Set([
    ...origins,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://shahrukhfrontend.sraproduction-co.workers.dev',
  ]),
)

await configureBucketCors(allowed)
console.log('B2 CORS updated for origins:')
for (const origin of allowed) console.log(' -', origin)
