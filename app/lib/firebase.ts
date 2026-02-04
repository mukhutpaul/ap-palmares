import { initializeApp, getApps } from "firebase/app"
import { getMessaging } from "firebase/messaging"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// 🔍 DEBUG TEMPORAIRE (IMPORTANT)
console.log("🔥 Firebase config:", firebaseConfig)

if (!firebaseConfig.projectId) {
  throw new Error("❌ Firebase projectId manquant. Vérifie .env.local")
}

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const messaging =
  typeof window !== "undefined" ? getMessaging(app) : null
