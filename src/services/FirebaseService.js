import { initializeApp } from 'firebase/app'
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc
} from 'firebase/firestore'

// Firebase configuration - Replace with your actual config
// Get this from Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: "AIzaSyD8gNK5326Ro_UxloIHtwdhIS-S4jTyoaQ",
  authDomain: "adtrade-8839a.firebaseapp.com",
  projectId: "adtrade-8839a",
  storageBucket: "adtrade-8839a.firebasestorage.app",
  messagingSenderId: "206150367048",
  appId: "1:206150367048:web:49ededc76200a3ca59657d",
  measurementId: "G-LD4G7FCX6H"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

class FirebaseService {
  /**
   * Sign up with email and password
   */
  async signUp(email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      return { success: true, user: userCredential.user }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      return { success: true, user: userCredential.user }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Sign out
   */
  async signOut() {
    try {
      await signOut(auth)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return auth.currentUser
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback)
  }

  /**
   * Save market data for an instrument
   */
  async saveMarketData(userId, instrument, data) {
    try {
      const docRef = doc(db, 'marketData', `${userId}_${instrument}`)
      await setDoc(docRef, {
        userId,
        instrument,
        data,
        updatedAt: new Date().toISOString()
      }, { merge: true })
      return { success: true }
    } catch (error) {
      console.error('Error saving market data:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get market data for an instrument
   */
  async getMarketData(userId, instrument) {
    try {
      const docRef = doc(db, 'marketData', `${userId}_${instrument}`)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() }
      } else {
        return { success: false, data: null }
      }
    } catch (error) {
      console.error('Error getting market data:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Save active trade
   */
  async saveActiveTrade(userId, trade) {
    try {
      const docRef = doc(db, 'activeTrades', trade.id)
      await setDoc(docRef, {
        ...trade,
        userId,
        updatedAt: new Date().toISOString()
      })
      return { success: true }
    } catch (error) {
      console.error('Error saving active trade:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get all active trades for a user
   */
  async getActiveTrades(userId) {
    try {
      const q = query(
        collection(db, 'activeTrades'),
        where('userId', '==', userId),
        where('status', '==', 'ACTIVE')
      )
      const querySnapshot = await getDocs(q)
      const trades = []
      querySnapshot.forEach((doc) => {
        trades.push({ id: doc.id, ...doc.data() })
      })
      return { success: true, data: trades }
    } catch (error) {
      console.error('Error getting active trades:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Update active trade
   */
  async updateActiveTrade(tradeId, updates) {
    try {
      const docRef = doc(db, 'activeTrades', tradeId)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      })
      return { success: true }
    } catch (error) {
      console.error('Error updating active trade:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Close trade (move to history)
   */
  async closeTrade(tradeId, closeData) {
    try {
      const docRef = doc(db, 'activeTrades', tradeId)
      const tradeDoc = await getDoc(docRef)
      
      if (!tradeDoc.exists()) {
        return { success: false, error: 'Trade not found' }
      }

      const trade = tradeDoc.data()
      
      // Add to history
      const historyRef = doc(db, 'tradeHistory', tradeId)
      await setDoc(historyRef, {
        ...trade,
        ...closeData,
        status: 'CLOSED',
        closedAt: new Date().toISOString()
      })

      // Delete from active trades
      await deleteDoc(docRef)
      
      return { success: true }
    } catch (error) {
      console.error('Error closing trade:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get trade history
   */
  async getTradeHistory(userId) {
    try {
      const q = query(
        collection(db, 'tradeHistory'),
        where('userId', '==', userId)
      )
      const querySnapshot = await getDocs(q)
      const history = []
      querySnapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() })
      })
      // Sort by closedAt descending
      history.sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt))
      return { success: true, data: history }
    } catch (error) {
      console.error('Error getting trade history:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Save Gemini API key for user
   */
  async saveApiKey(userId, apiKey) {
    try {
      const userDocRef = doc(db, 'users', userId)
      await setDoc(userDocRef, {
        apiKey: apiKey,
        updatedAt: new Date().toISOString()
      }, { merge: true })
      return { success: true }
    } catch (error) {
      console.error('Error saving API key:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get Gemini API key for user
   */
  async getApiKey(userId) {
    try {
      const userDocRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userDocRef)
      
      if (userDoc.exists()) {
        return { success: true, apiKey: userDoc.data().apiKey || null }
      } else {
        return { success: true, apiKey: null }
      }
    } catch (error) {
      console.error('Error getting API key:', error)
      return { success: false, error: error.message, apiKey: null }
    }
  }
}

const firebaseService = new FirebaseService()
export default firebaseService

