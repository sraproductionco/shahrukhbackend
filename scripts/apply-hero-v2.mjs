import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sql = fs.readFileSync(path.resolve(__dirname, '../sql/hero_v2.sql'), 'utf8')

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
const cols = await client.query(
  `select column_name from information_schema.columns where table_name='hero_settings' order by 1`,
)
const reels = await client.query(`select count(*)::int as n from hero_reels`)
console.log('hero_settings cols:', cols.rows.map((r) => r.column_name).join(', '))
console.log('hero_reels:', reels.rows[0].n)
await client.end()
