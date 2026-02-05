/**
 * Firebase configuration (example).
 * 1. Copy this file to firebase.js and fill in your project values.
 * 2. Get config from Firebase Console: Project Settings > General > Your apps.
 * 3. Enable Authentication > Email/Password and Firestore and Storage.
 * 4. Never commit firebase.js with real keys; add to .gitignore.
 *
 * Firestore: collections "users" (doc id = uid) and "projects" (doc id = project id, field userId).
 * Storage: profile photos at users/{uid}/profile.jpg
 */

export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
  measurementId: 'G-XXXXXXXXXX', // optional, for Analytics
}
