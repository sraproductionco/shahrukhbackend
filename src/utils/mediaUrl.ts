import type { Request } from 'express'
import { isDirectPublicMediaUrl, supabasePublicUrl } from '../services/supabaseStorage.js'

type MediaFields = {
  thumbnail_key?: string | null
  thumbnail_url?: string | null
  video_key?: string
  video_url?: string
  image_key?: string | null
  image_url?: string | null
}

/** Prefer Supabase public URLs so playback never depends on B2 download caps. */
export function mediaProvider(): 'supabase' | 'b2' {
  const raw = (process.env.MEDIA_PROVIDER || 'supabase').toLowerCase()
  return raw === 'b2' ? 'b2' : 'supabase'
}

export function apiBaseFromRequest(req: Request): string {
  const envBase = process.env.PUBLIC_API_URL?.replace(/\/$/, '')
  if (envBase) return envBase

  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https')
  const host = String(req.headers['x-forwarded-host'] || req.get('host') || '')
  return `${proto}://${host}`
}

/** B2 private objects via backend media proxy (signed redirect). */
export function mediaProxyUrl(
  apiBase: string,
  key: string | null | undefined,
  opts?: { stream?: boolean },
): string | null {
  if (!key) return null
  const params = new URLSearchParams({ key })
  if (opts?.stream) params.set('stream', '1')
  return `${apiBase}/api/media?${params.toString()}`
}

/**
 * Resolve a playable/public media URL.
 * Default provider is Supabase (public bucket) — no B2 download bandwidth.
 */
export function resolveMediaUrl(
  apiBase: string,
  key: string | null | undefined,
  storedUrl?: string | null,
  opts?: { stream?: boolean },
): string | null {
  if (storedUrl && isDirectPublicMediaUrl(storedUrl)) {
    return storedUrl
  }

  if (key) {
    if (mediaProvider() === 'supabase') {
      return supabasePublicUrl(key)
    }
    return mediaProxyUrl(apiBase, key, opts)
  }

  return storedUrl ?? null
}

export function withProxiedMedia<T extends MediaFields>(project: T, apiBase: string): T {
  return {
    ...project,
    thumbnail_url:
      resolveMediaUrl(apiBase, project.thumbnail_key, project.thumbnail_url, { stream: true }) ??
      null,
    video_url: resolveMediaUrl(apiBase, project.video_key, project.video_url) ?? '',
  }
}

export function withProxiedMediaList<T extends MediaFields>(projects: T[], apiBase: string): T[] {
  return projects.map((p) => withProxiedMedia(p, apiBase))
}
