import type { Request } from 'express'

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

/** B2 private objects are served via backend media proxy (signed redirect). */
export function mediaProxyUrl(
  apiBase: string,
  key: string | null | undefined,
  opts?: { stream?: boolean },
): string | null {
  if (!key) return null
  const params = new URLSearchParams({ key })
  // Stream mode for images; videos use redirect (better seeking / Vercel-friendly)
  if (opts?.stream) params.set('stream', '1')
  return `${apiBase}/api/media?${params.toString()}`
}

function resolveUrl(
  apiBase: string,
  key: string | null | undefined,
  url: string | null | undefined,
  stream = false,
): string | null {
  return mediaProxyUrl(apiBase, key, { stream }) ?? url ?? null
}

/** Always prefer proxied B2 keys for portfolio media. */
export function withProxiedMedia<T extends MediaFields>(project: T, apiBase: string): T {
  return {
    ...project,
    thumbnail_url: resolveUrl(apiBase, project.thumbnail_key, project.thumbnail_url, true),
    video_url: resolveUrl(apiBase, project.video_key, project.video_url, false) ?? '',
  }
}

export function withProxiedMediaList<T extends MediaFields>(projects: T[], apiBase: string): T[] {
  return projects.map((p) => withProxiedMedia(p, apiBase))
}
