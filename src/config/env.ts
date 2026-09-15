import dotenv from 'dotenv'

dotenv.config()

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (value === undefined || value === '') {
    return ''
  }
  return value
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  databaseUrl: required('DATABASE_URL'),
  b2: {
    keyId: required('B2_KEY_ID'),
    applicationKey: required('B2_APPLICATION_KEY'),
    bucketName: required('B2_BUCKET_NAME'),
    bucketId: required('B2_BUCKET_ID'),
    endpoint: required('B2_ENDPOINT', 'https://s3.us-west-004.backblazeb2.com'),
    region: required('B2_REGION', 'us-west-004'),
    publicUrl: required('B2_PUBLIC_URL'),
  },
}

function isFilled(value: string): boolean {
  if (!value) return false
  const lower = value.toLowerCase()
  return !(
    lower.includes('your_') ||
    lower.includes('your-') ||
    lower.includes('YOUR_PROJECT_REF'.toLowerCase())
  )
}

export function hasSupabaseConfig(): boolean {
  return isFilled(env.supabaseUrl) && isFilled(env.supabaseServiceRoleKey)
}

export function hasB2Config(): boolean {
  return (
    isFilled(env.b2.keyId) &&
    isFilled(env.b2.applicationKey) &&
    isFilled(env.b2.bucketName) &&
    isFilled(env.b2.endpoint)
  )
}
