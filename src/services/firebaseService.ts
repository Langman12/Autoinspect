import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage'
import { getAuth, signInAnonymously } from 'firebase/auth'
import type { InspectionReport } from '../types'
import { storageService } from './storageService'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
}

const hasConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('your_firebase_api_key')
)
const app = hasConfig ? initializeApp(firebaseConfig) : null
const db = app ? getFirestore(app) : null
const storage = app ? getStorage(app) : null
const auth = app ? getAuth(app) : null

export const firebaseService = {
  async ensureAuth() {
    if (!auth) return 'local'
    if (!auth.currentUser) await signInAnonymously(auth)
    return auth.currentUser!.uid
  },

  async saveReport(report: InspectionReport, imageDataUrl?: string): Promise<string> {
    if (!db || !storage) {
      return await storageService.saveReport(report)
    }
    const uid = await this.ensureAuth()
    let imageUrl = report.imageUrl
    if (imageDataUrl) {
      const storageRef = ref(storage, `reports/${uid}/${report.id}.jpg`)
      await uploadString(storageRef, imageDataUrl, 'data_url')
      imageUrl = await getDownloadURL(storageRef)
    }
    const docRef = await addDoc(collection(db, 'users', uid, 'reports'), {
      ...report,
      imageUrl,
      userId: uid,
      savedAt: Date.now(),
    })
    return docRef.id
  },

  async getReports(limitCount = 50): Promise<InspectionReport[]> {
    if (!db) {
      return await storageService.getReports(limitCount)
    }
    const uid = await this.ensureAuth()
    const q = query(collection(db, 'users', uid, 'reports'), orderBy('timestamp', 'desc'), limit(limitCount))
    const snap = await getDocs(q)
    return snap.docs.map((d) => d.data() as InspectionReport)
  },
}

