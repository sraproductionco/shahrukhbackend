import type { Request } from 'express'
import { isDirectPublicMediaUrl } from '../services/supabaseStorage.js'

type MediaFields = {
  thumbnail_key?: string | null
  thumbnail_url?: string | null
  video_key?: string
  video_url?: string
  image_key?: string | null
  image_url?: string | null
}

export function apiBaseFromRequest(req: Request): string {
  const envBase = process.env.PUBLIC_API_URL?.replace(/\/$/, '')
  if (envBase) return envBase

  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https')
  const host = String(req.headers['x-forwarded-host'] || req.get('host') || '')
  return `${proto}://${host}`
}

export function mediaProxyUrl(apiBase: string, key: string | null | undefined): string | null {
  if (!key) return null
  return `${apiBase}/api/media?key=${encodeURIComponent(key)}&stream=1`
}

function resolveUrl(
  apiBase: string,
  key: string | null | undefined,
  url: string | null | undefined,
): string | null {
  if (isDirectPublicMediaUrl(url)) return url ?? null
  if (key && isDirectPublicMediaUrl(`https://placeholder/${key}`)) {
    /* no-op — keys alone are not public URLs */
  }
  // Prefer proxy for private B2 keys; keep explicit public URLs as fallback
  return mediaProxyUrl(apiBase, key) ?? url ?? null
}

/** Rewrite private B2 URLs to backend proxy; keep Supabase public URLs as-is */
export function withProxiedMedia<T extends MediaFields>(project: T, apiBase: string): T {
  return {
    ...project,
    thumbnail_url: resolveUrl(apiBase, project.thumbnail_key, project.thumbnail_url),
    video_url: resolveUrl(apiBase, project.video_key, project.video_url) ?? '',
  }
}

export function withProxiedMediaList<T extends MediaFields>(projects: T[], apiBase: string): T[] {
  return projects.map((p) => withProxiedMedia(p, apiBase))
}
