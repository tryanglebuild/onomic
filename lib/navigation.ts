/**
 * A same-origin, relative path: starts with exactly one "/", never "//host"
 * (protocol-relative) or "/\host" (some browsers treat backslash as slash),
 * and never an absolute URL ("https://…") since those don't start with "/".
 */
const SAFE_PATH_RE = /^\/(?!\/|\\)[^\s\\]*$/

export function isSafeRedirectPath(path: string | null | undefined): path is string {
  return typeof path === 'string' && path.length > 0 && SAFE_PATH_RE.test(path)
}

/** Returns `path` if it's safe to redirect to, otherwise `fallback`. Use at
 * every boundary where a redirect target comes from user input (query
 * params, form fields) — never pass such a value to `redirect()` directly. */
export function safeRedirectPath(path: string | null | undefined, fallback = '/'): string {
  return isSafeRedirectPath(path) ? path : fallback
}
