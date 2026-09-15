import app, { bootstrap } from './app.js'
import { env } from './config/env.js'

await bootstrap()

app.listen(env.port, () => {
  console.log(`shahrukhbackend listening on http://localhost:${env.port}`)
  console.log(`Health check: http://localhost:${env.port}/api/health`)
})
