import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const email = process.env.ADMIN_EMAIL.toLowerCase()
const { data, error } = await supabase
  .from('admins')
  .select('email, password_hash')
  .eq('email', email)
  .single()

if (error) {
  console.error(error)
  process.exit(1)
}

const passwordMatches = await bcrypt.compare(process.env.ADMIN_PASSWORD, data.password_hash)
console.log(JSON.stringify({ email: data.email, passwordMatches }, null, 2))
