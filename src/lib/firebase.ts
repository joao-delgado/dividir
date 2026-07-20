import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase config is read from Vite env vars (VITE_*). Copy .env.example to
// .env.local and fill in the values from your Firebase project settings.
// These values are not secrets: they ship in the compiled bundle by design.
// Access is actually secured by Firestore security rules (see firestore.rules),
// which scope every read/write to João's and Inês's two Auth UIDs.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const missing = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key)

if (missing.length > 0) {
  throw new Error(
    `Missing Firebase config: ${missing.join(', ')}. ` +
      'Copy .env.example to .env.local and fill in the values, then restart the dev server.',
  )
}

const app = initializeApp(firebaseConfig)

// Auth uses the SDK's default local persistence, so once João or Inês signs in
// they stay signed in until they explicitly sign out (no custom session logic).
export const auth = getAuth(app)
export const db = getFirestore(app)

export default app
