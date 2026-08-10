import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  addDoc as addDocOriginal, 
  updateDoc as updateDocOriginal, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  setDoc as setDocOriginal,
  serverTimestamp 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

const configAny = firebaseConfig as any;
const databaseId = configAny.firestoreDatabaseId || 'ai-studio-pettycashregiste-730a9cfd-1d99-477c-981b-b9e4babaaa3a';

export const db = databaseId && databaseId !== '(default)'
  ? getFirestore(app, databaseId)
  : getFirestore(app);

export const storage = configAny.storageBucket
  ? getStorage(app, configAny.storageBucket)
  : getStorage(app);

export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export const setDoc = async (reference: any, data: any, options?: any) => {
  try {
    return options ? await setDocOriginal(reference, sanitizeForFirestore(data), options) : await setDocOriginal(reference, sanitizeForFirestore(data));
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
      console.warn('Firestore daily write quota reached:', err?.message || err);
      throw new Error('Firestore daily write quota reached. Please try again later.');
    }
    throw err;
  }
};

export const addDoc = async (reference: any, data: any) => {
  try {
    return await addDocOriginal(reference, sanitizeForFirestore(data));
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
      console.warn('Firestore daily write quota reached:', err?.message || err);
      throw new Error('Firestore daily write quota reached. Please try again later.');
    }
    throw err;
  }
};

export const updateDoc = async (reference: any, data: any, options?: any) => {
  try {
    return options ? await updateDocOriginal(reference, sanitizeForFirestore(data), options) : await updateDocOriginal(reference, sanitizeForFirestore(data));
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
      console.warn('Firestore daily write quota reached:', err?.message || err);
      throw new Error('Firestore daily write quota reached. Please try again later.');
    }
    throw err;
  }
};

export { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
};

