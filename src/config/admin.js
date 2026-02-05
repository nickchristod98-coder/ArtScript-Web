/**
 * Admin access: only this email can open the Admin Dashboard.
 * Admin must use the password below to sign in (or set VITE_ADMIN_PASSWORD in .env).
 */

export const ADMIN_EMAIL = 'nickchristod98@gmail.com'

/** Prefer env so the password is not committed. Fallback for local dev. */
export const ADMIN_PASSWORD =
  import.meta.env.VITE_ADMIN_PASSWORD || '49Vy8ue9'
