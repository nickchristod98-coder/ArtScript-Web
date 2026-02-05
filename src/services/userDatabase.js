/**
 * Central user persistence for admin/newsletter.
 * Mock: stores in localStorage under artscript_admin_users.
 * Replace with Firebase/Firestore when ready (see services/firebase.js).
 */

const ADMIN_STORAGE_KEY = 'artscript_admin_users'

const defaultAdminData = () => ({
  users: [], // { email, role, signupDate, projectCount? }[]
})

function loadAdminData() {
  if (typeof localStorage === 'undefined') return defaultAdminData()
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY)
    if (!raw) return defaultAdminData()
    const data = JSON.parse(raw)
    return { users: Array.isArray(data.users) ? data.users : [] }
  } catch {
    return defaultAdminData()
  }
}

function saveAdminData(data) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save admin user data', e)
  }
}

/**
 * Save a newly registered user to the central "Admin" store (for newsletter / updates).
 * Mock: writes to localStorage. Use Firebase/Firestore in production.
 * @param {Object} userData - { email: string, role: string }
 */
export function saveUserToDatabase(userData) {
  if (!userData?.email) return
  const data = loadAdminData()
  const email = userData.email.trim().toLowerCase()
  const signupDate = (userData.signupDate && new Date(userData.signupDate).toISOString()) || new Date().toISOString()
  const role = userData.role || 'writer'

  const existing = data.users.findIndex((u) => u.email === email)
  const entry = { email, role, signupDate, projectCount: data.users[existing]?.projectCount ?? 0 }
  if (existing >= 0) {
    data.users[existing] = { ...data.users[existing], ...entry }
  } else {
    data.users.push(entry)
  }

  saveAdminData(data)
  if (import.meta.env.DEV) {
    console.log('[Admin] User saved:', { email, role, signupDate })
  }
}

/**
 * Get all registered users (for Admin Dashboard).
 * Mock: reads from localStorage.
 */
export function getAllUsersForAdmin() {
  const data = loadAdminData()
  return [...data.users].sort((a, b) => new Date(b.signupDate) - new Date(a.signupDate))
}

/**
 * Update project count for a user (by email). Call when user adds/removes projects.
 */
export function updateUserProjectCount(email, count) {
  if (!email) return
  const data = loadAdminData()
  const normalized = email.trim().toLowerCase()
  const idx = data.users.findIndex((u) => u.email === normalized)
  if (idx >= 0) {
    data.users[idx].projectCount = Math.max(0, count)
    saveAdminData(data)
  }
}
