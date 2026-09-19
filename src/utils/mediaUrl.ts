import type { Request } from 'express'

type MediaFields = {
  thumbnail_key?: string | null
  thumbnail_url?: string | null
  video_key?: string
  video_url?: string
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
  return `${apiBase}/api/media?key=${encodeURIComponent(key)}`
}

/** Rewrite private B2 URLs to backend proxy URLs */
export function withProxiedMedia<T extends MediaFields>(project: T, apiBase: string): T {
  return {
    ...project,
    thumbnail_url:
      mediaProxyUrl(apiBase, project.thumbnail_key) ?? project.thumbnail_url ?? null,
    video_url: mediaProxyUrl(apiBase, project.video_key) ?? project.video_url ?? '',
  }
}

export function withProxiedMediaList<T extends MediaFields>(projects: T[], apiBase: string): T[] {
  return projects.map((p) => withProxiedMedia(p, apiBase))
}
