import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { normalizeKishiState } from '@/src/services/kishiApi';
import type { KishiState } from '@/src/types/kishi';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

void setPersistence(auth, browserLocalPersistence).catch(() => undefined);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export function subscribeToAuth(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return result.user;
}

export async function sendResetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function resendVerificationEmail(user: User): Promise<void> {
  await sendEmailVerification(user);
}

export async function reloadCurrentUser(): Promise<User | null> {
  if (!auth.currentUser) return null;
  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true);
  return auth.currentUser;
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        out[key] = stripUndefined(val);
      }
    }
    return out as T;
  }
  return value;
}

function buildSanitizedWorkspaceFields(state: KishiState) {
  const normalized = normalizeKishiState(state);
  return stripUndefined({
    lastDateStr: (normalized.lastDateStr || '').slice(0, 20),
    user: {
      name: (normalized.user.name || 'Júlia').slice(0, 80),
      initial: (normalized.user.initial || 'J').slice(0, 4).toUpperCase(),
      role: (normalized.user.role || 'Operação 99 Food & Rides').slice(0, 120),
    },
    portals: normalized.portals.slice(0, 100),
    sheets: normalized.sheets.slice(0, 200),
    campaigns: {
      drv: (normalized.campaigns?.drv || []).slice(0, 100),
      food: (normalized.campaigns?.food || []).slice(0, 100),
    },
    activeCampaigns: normalized.activeCampaigns.slice(0, 100),
    channels: normalized.channels,
    tasks: normalized.tasks.slice(0, 500),
    history: normalized.history.slice(0, 1000),
    timeBank: normalized.timeBank || {},
  });
}

export function subscribeWorkspaceDoc(
  uid: string,
  callbacks: {
    onRemoteData: (state: KishiState, hasPendingWrites: boolean) => void;
    onMissingDoc: () => void;
    onError: (err: Error) => void;
  },
): Unsubscribe {
  const path = `workspaces/${uid}`;
  const docRef = doc(db, 'workspaces', uid);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callbacks.onMissingDoc();
        return;
      }
      const data = snapshot.data() as Partial<KishiState>;
      const normalized = normalizeKishiState(data);
      callbacks.onRemoteData(normalized, snapshot.metadata.hasPendingWrites);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

export async function createWorkspaceDoc(uid: string, state: KishiState): Promise<void> {
  const path = `workspaces/${uid}`;
  const docRef = doc(db, 'workspaces', uid);
  const fields = buildSanitizedWorkspaceFields(state);

  try {
    await setDoc(docRef, {
      ownerId: uid,
      ...fields,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateWorkspaceDoc(uid: string, state: KishiState): Promise<void> {
  const path = `workspaces/${uid}`;
  const docRef = doc(db, 'workspaces', uid);
  const fields = buildSanitizedWorkspaceFields(state);

  try {
    await updateDoc(docRef, {
      ...fields,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
