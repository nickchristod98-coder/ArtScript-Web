/**
 * Firebase Authentication, Firestore, and Storage for ArtScript.
 * When firebase.js config has real values (apiKey !== 'YOUR_API_KEY'), auth and data sync to Firebase.
 * Otherwise the app runs with local-only auth/data.
 */

import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore'
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage'
import { firebaseConfig } from '@/config/firebase'

const isConfigured =
  firebaseConfig &&
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'YOUR_PROJECT_ID'

let app = null
let auth = null
let db = null
let storage = null

if (isConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
}

export const isFirebaseConfigured = () => !!isConfigured

export function getFirebaseAuth() {
  return auth
}

export function getFirestoreDb() {
  return db
}

/** Subscribe to auth state (for initial load / persistence). */
export function subscribeToAuth(callback) {
  if (!auth) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, (user) => callback(user))
}

/** Sign in with email and password. */
export async function signIn(email, password) {
  if (!auth) throw new Error('Firebase not configured')
  const normalized = email.trim().toLowerCase()
  const userCredential = await signInWithEmailAndPassword(auth, normalized, password)
  return userCredential.user.uid
}

/** Create account with email and password. */
export async function signUp(email, password) {
  if (!auth) throw new Error('Firebase not configured')
  const normalized = email.trim().toLowerCase()
  const userCredential = await createUserWithEmailAndPassword(auth, normalized, password)
  return userCredential.user.uid
}

/** Sign out. */
export async function signOut() {
  if (auth) await firebaseSignOut(auth)
}

const USERS_COLLECTION = 'users'
const PROJECTS_COLLECTION = 'projects'

/** Get user profile from Firestore (nickname, role, profilePhotoUrl, name, surname, etc.). */
export async function getUserProfile(uid) {
  if (!db || !uid) return null
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid))
  if (!snap.exists()) return null
  return snap.data()
}

/** Set user profile in Firestore. Merges with existing. */
export async function setUserProfile(uid, data) {
  if (!db || !uid) return
  const userRef = doc(db, USERS_COLLECTION, uid)
  const existing = await getDoc(userRef)
  const payload = {
    ...(existing.exists() ? existing.data() : {}),
    ...data,
    updatedAt: new Date().toISOString(),
  }
  await setDoc(userRef, payload, { merge: true })
}

/** Get all projects for a user (ordered by lastModified desc). */
export async function getProjects(uid) {
  if (!db || !uid) return []
  const q = query(collection(db, PROJECTS_COLLECTION), where('userId', '==', uid))
  const snap = await getDocs(q)
  const list = snap.docs.map((d) => {
    const data = d.data()
    return {
      id: data.id,
      title: data.title,
      roleAtCreation: data.roleAtCreation,
      lastModified: data.lastModified,
      content: data.content,
    }
  })
  list.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0))
  return list
}

/** Add or update a single project in Firestore. */
export async function setProject(uid, project) {
  if (!db || !uid || !project?.id) return
  const ref = doc(db, PROJECTS_COLLECTION, project.id)
  await setDoc(ref, {
    userId: uid,
    id: project.id,
    title: project.title || '',
    roleAtCreation: project.roleAtCreation || 'writer',
    lastModified: project.lastModified ?? Date.now(),
    content: project.content || '',
  })
}

/** Remove a project from Firestore. */
export async function removeProject(projectId) {
  if (!db || !projectId) return
  await deleteDoc(doc(db, PROJECTS_COLLECTION, projectId))
}

/** Upload profile photo (data URL) to Storage and return download URL. */
export async function uploadProfilePhoto(uid, dataUrl) {
  if (!storage || !uid) return null
  if (!dataUrl || !dataUrl.startsWith('data:')) return null
  const storageRef = ref(storage, `users/${uid}/profile.jpg`)
  await uploadString(storageRef, dataUrl, 'data_url')
  return getDownloadURL(storageRef)
}
