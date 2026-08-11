const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) ?? ''
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '')

/**
 * Resolves a path returned by the backend (e.g. "/uploads/images/xxx.jpg")
 * into an absolute URL against the backend's origin. Absolute URLs (legacy
 * data seeded with external image links) pass through unchanged.
 */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path
  return `${BACKEND_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}
