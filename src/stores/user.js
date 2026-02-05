/**
 * User store: auth, profile, and project list.
 * When Firebase is configured: data lives in Firestore; localStorage is used as cache only.
 * When Firebase is not configured: data in localStorage (artscript_user_data).
 * Shape: { user: { uid?, email, role?, isNewUser?, profilePhoto?, nickname?, name?, surname? }, projects: [ ... ] }
 */

import { defineStore } from 'pinia'
import { updateUserProjectCount } from '@/services/userDatabase'
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '@/config/admin'
import {
  isFirebaseConfigured,
  signIn as firebaseSignIn,
  signUp as firebaseSignUp,
  signOut as firebaseSignOut,
  getUserProfile,
  setUserProfile as firebaseSetUserProfile,
  getProjects as firebaseGetProjects,
  setProject as firebaseSetProject,
  removeProject as firebaseRemoveProject,
  uploadProfilePhoto,
} from '@/services/firebase'

const STORAGE_KEY = 'artscript_user_data'
const MAX_PROJECTS = 4

const defaultData = () => ({
  user: null,
  projects: [],
})

function loadFromStorage() {
  if (!isFirebaseConfigured() && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return defaultData()
      const data = JSON.parse(raw)
      const user = data.user ?? null
      if (user && !user.profilePhoto) user.profilePhoto = null
      return {
        user,
        projects: Array.isArray(data.projects) ? data.projects : [],
      }
    } catch {
      return defaultData()
    }
  }
  return defaultData()
}

function saveToStorage(data) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save artscript_user_data', e)
  }
}

export const useUserStore = defineStore('user', {
  state: () => ({
    _data: loadFromStorage(),
  }),

  getters: {
    isLoggedIn: (state) => !!state._data.user,
    user: (state) => state._data.user,
    uid: (state) => state._data.user?.uid ?? null,
    email: (state) => state._data.user?.email ?? null,
    role: (state) => state._data.user?.role ?? null,
    nickname: (state) => state._data.user?.nickname ?? null,
    name: (state) => state._data.user?.name ?? null,
    surname: (state) => state._data.user?.surname ?? null,
    profilePhoto: (state) => state._data.user?.profilePhoto ?? null,
    isNewUser: (state) => !!state._data.user?.isNewUser,
    projects: (state) => state._data.projects,
    projectsCount: (state) => state._data.projects.length,
    canCreateProject: (state) => {
      if (state._data.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return true
      return state._data.projects.length < MAX_PROJECTS
    },
    isAtProjectLimit: (state) => {
      if (state._data.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return false
      return state._data.projects.length >= MAX_PROJECTS
    },
  },

  actions: {
    _persist() {
      saveToStorage(this._data)
    },

    /** Login: Firebase Auth when configured, else mock. Returns { ok, error? }. */
    async login(email, password, isSignUp = false) {
      const normalizedEmail = email?.trim().toLowerCase()
      if (!normalizedEmail) return { ok: false, error: 'Please enter a valid email.' }

      if (isFirebaseConfigured()) {
        try {
          const uid = isSignUp
            ? await firebaseSignUp(normalizedEmail, password)
            : await firebaseSignIn(normalizedEmail, password)
          await this.syncFromFirebase(uid, normalizedEmail)
          if (this._data.user?.email) {
            updateUserProjectCount(this._data.user.email, this._data.projects.length)
          }
          return { ok: true }
        } catch (e) {
          const code = e?.code || ''
          if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') return { ok: false, error: 'Invalid password.' }
          if (code === 'auth/email-already-in-use') return { ok: false, error: 'This email is already registered.' }
          if (code === 'auth/weak-password') return { ok: false, error: 'Password should be at least 6 characters.' }
          return { ok: false, error: e?.message || 'Sign in failed.' }
        }
      }

      // Mock auth (no Firebase)
      if (normalizedEmail === ADMIN_EMAIL.toLowerCase() && password !== ADMIN_PASSWORD) {
        return { ok: false, error: 'Invalid password.' }
      }
      const data = loadFromStorage()
      let user = data.user
      if (isSignUp) {
        user = {
          email: normalizedEmail,
          role: null,
          isNewUser: true,
          profilePhoto: null,
          nickname: null,
          name: null,
          surname: null,
        }
      } else {
        if (!user) {
          user = { email: normalizedEmail, role: null, isNewUser: true, profilePhoto: null, nickname: null, name: null, surname: null }
        } else {
          user = { ...user, email: normalizedEmail }
        }
      }
      this._data.user = user
      this._data.projects = data.projects ?? []
      this._persist()
      if (user?.email) updateUserProjectCount(user.email, (data.projects ?? []).length)
      return { ok: true }
    },

    /** Populate store from Firestore (after Firebase login). */
    async syncFromFirebase(uid, email) {
      const profile = await getUserProfile(uid)
      const projects = await firebaseGetProjects(uid)
      this._data.user = {
        uid,
        email,
        role: profile?.role ?? null,
        isNewUser: profile?.isNewUser ?? false,
        profilePhoto: profile?.profilePhotoUrl ?? profile?.profilePhoto ?? null,
        nickname: profile?.nickname ?? null,
        name: profile?.name ?? null,
        surname: profile?.surname ?? null,
      }
      this._data.projects = projects
      this._persist()
    },

    /** Clear user and projects (e.g. when auth state becomes null). */
    clearForLogout() {
      this._data = defaultData()
      this._persist()
    },

    logout() {
      if (isFirebaseConfigured()) firebaseSignOut()
      this._data = defaultData()
      this._persist()
    },

    /** Complete profile: set role, optional nickname (stored lowercase), name, surname. Clears isNewUser. */
    async completeProfile(role, nickname = null, name = null, surname = null) {
      if (!this._data.user || !['writer', 'actor', 'director'].includes(role)) return false
      this._data.user.role = role
      if (nickname !== null && nickname !== undefined) {
        const v = String(nickname).trim().toLowerCase() || null
        this._data.user.nickname = v ? v.slice(0, 15) : null
      }
      if (name !== null && name !== undefined) this._data.user.name = String(name).trim() || null
      if (surname !== null && surname !== undefined) this._data.user.surname = String(surname).trim() || null
      this._data.user.isNewUser = false
      this._persist()
      if (isFirebaseConfigured() && this._data.user.uid) {
        await firebaseSetUserProfile(this._data.user.uid, {
          email: this._data.user.email,
          role: this._data.user.role,
          nickname: this._data.user.nickname,
          name: this._data.user.name,
          surname: this._data.user.surname,
          signupDate: this._data.user.signupDate || new Date().toISOString(),
        })
      }
      return true
    },

    /** Set profile photo (data URL string). Pass null to remove. Uploads to Storage when Firebase is on. */
    async setProfilePhoto(dataUrl) {
      if (!this._data.user) return
      if (isFirebaseConfigured() && this._data.user.uid) {
        if (dataUrl && dataUrl.startsWith('data:')) {
          try {
            const url = await uploadProfilePhoto(this._data.user.uid, dataUrl)
            if (url) {
              this._data.user.profilePhoto = url
              await firebaseSetUserProfile(this._data.user.uid, { profilePhotoUrl: url })
            }
          } catch {
            this._data.user.profilePhoto = dataUrl
          }
        } else {
          this._data.user.profilePhoto = null
          await firebaseSetUserProfile(this._data.user.uid, { profilePhotoUrl: null })
        }
      } else {
        this._data.user.profilePhoto = dataUrl || null
      }
      this._persist()
    },

    /** Set nickname (stored lowercase, max 15 chars). */
    async setNickname(value) {
      if (!this._data.user) return
      const v = value?.trim().toLowerCase() || null
      this._data.user.nickname = v ? v.slice(0, 15) : null
      this._persist()
      if (isFirebaseConfigured() && this._data.user.uid) {
        await firebaseSetUserProfile(this._data.user.uid, { nickname: this._data.user.nickname })
      }
    },

    async setName(value) {
      if (!this._data.user) return
      this._data.user.name = value?.trim() || null
      this._persist()
      if (isFirebaseConfigured() && this._data.user.uid) {
        await firebaseSetUserProfile(this._data.user.uid, { name: this._data.user.name })
      }
    },

    async setSurname(value) {
      if (!this._data.user) return
      this._data.user.surname = value?.trim() || null
      this._persist()
      if (isFirebaseConfigured() && this._data.user.uid) {
        await firebaseSetUserProfile(this._data.user.uid, { surname: this._data.user.surname })
      }
    },

    /** Add a project to the list. Returns false if at limit (admin has unlimited). */
    async addProject(project) {
      const isAdmin = this._data.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      if (!isAdmin && this._data.projects.length >= MAX_PROJECTS) return false
      const entry = {
        id: project.id,
        title: project.title,
        roleAtCreation: project.roleAtCreation,
        lastModified: project.lastModified ?? Date.now(),
        content: project.content,
      }
      this._data.projects.push(entry)
      this._persist()
      if (isFirebaseConfigured() && this._data.user?.uid) {
        await firebaseSetProject(this._data.user.uid, entry)
      }
      if (this._data.user?.email) {
        updateUserProjectCount(this._data.user.email, this._data.projects.length)
      }
      return true
    },

    /** Update an existing project's title, lastModified, and content. */
    async updateProject(id, payload) {
      const idx = this._data.projects.findIndex((p) => p.id === id)
      if (idx === -1) return false
      if (payload.title !== undefined) this._data.projects[idx].title = payload.title
      if (payload.lastModified !== undefined) this._data.projects[idx].lastModified = payload.lastModified
      if (payload.content !== undefined) this._data.projects[idx].content = payload.content
      this._persist()
      if (isFirebaseConfigured() && this._data.user?.uid) {
        await firebaseSetProject(this._data.user.uid, this._data.projects[idx])
      }
      return true
    },

    /** Remove a project from the list. */
    async removeProject(id) {
      this._data.projects = this._data.projects.filter((p) => p.id !== id)
      this._persist()
      if (isFirebaseConfigured()) {
        await firebaseRemoveProject(id)
      }
      if (this._data.user?.email) {
        updateUserProjectCount(this._data.user.email, this._data.projects.length)
      }
    },

    /** Get project by id. */
    getProject(id) {
      return this._data.projects.find((p) => p.id === id) ?? null
    },

    /** Rehydrate from localStorage (only when Firebase is not used). */
    rehydrate() {
      if (!isFirebaseConfigured()) this._data = loadFromStorage()
    },
  },
})
