import 'dotenv/config'
import { createPresignedDownloadUrl, getObjectStream } from '../src/services/storage.ts'

const key = process.argv[2] || 'thumbnails/1789826834401-glutes.png'

try {
  const obj = await getObjectStream(key)
  const bytes = await obj.Body.transformToByteArray()
  console.log('directGet OK', obj.ContentType, bytes.length)
} catch (err) {
  console.error('directGet FAIL', err.message || err)
}

const url = await createPresignedDownloadUrl(key)
console.log('signed', url.slice(0, 160))

const head = await fetch(url, { method: 'HEAD' })
console.log('HEAD', head.status)

const get = await fetch(url)
console.log('GET', get.status, get.headers.get('content-type'), (await get.arrayBuffer()).byteLength)
