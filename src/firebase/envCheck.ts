const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  ...(measurementId ? { measurementId } : {}),
}

const PLACEHOLDER_PROJECT_ID = 'your-project-id'
const PLACEHOLDER_API_KEY = 'your-dev-api-key'

export function isFirebaseConfigured(): boolean {
  const { apiKey, projectId, appId } = firebaseConfig
  if (!apiKey || !projectId || !appId) return false
  if (projectId === PLACEHOLDER_PROJECT_ID || apiKey === PLACEHOLDER_API_KEY) {
    return false
  }
  return true
}
