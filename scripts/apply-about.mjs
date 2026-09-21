import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sql = fs.readFileSync(path.resolve(__dirname, '../sql/about.sql'), 'utf8')

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
await client.query(sql)
const tables = await client.query(
  `select table_name from information_schema.tables where table_schema='public' and table_name like 'about%' order by 1`,
)
console.log('about tables:', tables.rows.map((r) => r.table_name).join(', '))
const p = await client.query('select display_name, years_experience from about_profile where id=1')
console.log('profile', p.rows[0])
const b = await client.query('select count(*)::int as n from about_brands')
const s = await client.query('select count(*)::int as n from about_process_steps')
console.log('brands', b.rows[0].n, 'steps', s.rows[0].n)
await client.end()
