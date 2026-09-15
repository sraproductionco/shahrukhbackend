import 'dotenv/config'
import bcrypt from 'bcryptjs'
import pg from 'pg'

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

const email = (process.env.ADMIN_EMAIL || '').toLowerCase()
const password = process.env.ADMIN_PASSWORD || ''

if (!email || !password) {
  console.error('ADMIN_EMAIL and ADMIN_PASSWORD required')
  process.exit(1)
}

await client.connect()
const existing = await client.query('select id from admins where email = $1', [email])
if (existing.rowCount) {
  console.log('Admin already exists:', email)
} else {
  const hash = await bcrypt.hash(password, 10)
  await client.query(
    'insert into admins (email, password_hash, display_name) values ($1, $2, $3)',
    [email, hash, 'Admin'],
  )
  console.log('Admin created:', email)
}
await client.end()
