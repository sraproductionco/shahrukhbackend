import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sql = fs.readFileSync(path.resolve(__dirname, '../sql/schema.sql'), 'utf8')

const host = process.env.DB_HOST
const user = process.env.DB_USER
const password = process.env.DB_PASSWORD
const database = process.env.DB_NAME || 'postgres'
const port = Number(process.env.DB_PORT || 5432)

if (!host || !user || !password) {
  console.error('Set DB_HOST, DB_USER, and DB_PASSWORD in .env to apply schema.')
  process.exit(1)
}

const client = new pg.Client({
  host,
  port,
  database,
  user,
  password,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
await client.query(sql)
const tables = await client.query(
  `select table_name from information_schema.tables where table_schema='public' order by 1`,
)
console.log('Tables:', tables.rows.map((r) => r.table_name).join(', '))
await client.end()
