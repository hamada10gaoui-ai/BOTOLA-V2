import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  getDocFromServer,
  onSnapshot,
  Timestamp,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Tournament, Team, Player, Referee, Match } from './types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Cloud Firestore using database specified inside config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Silence internal Firestore verbose/network warning logs to prevent test runner/CI pipeline false-positive errors
try {
  setLogLevel('silent');
} catch (e) {
  console.warn("Failed to set Firestore log level:", e);
}

// Google Auth Provider setup
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Error helper types in strict compliance with Firebase Integration Skill guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validation constraint testing
export async function testConnection() {
  try {
    // Check if the environment/browser is offline to prevent unnecessary network requests
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn("Please check your Firebase configuration. Client is offline.");
      return;
    }
    const testDocRef = doc(db, 'test', 'connection');
    await getDocFromServer(testDocRef);
    console.log("Firebase Connection verified successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration. Client is offline.");
    } else {
      console.warn("Firebase Connection check warning:", error instanceof Error ? error.message : error);
    }
  }
}

// Run connection verification
testConnection();

// Google login function via Popups
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
}

// Logout session function
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

// --- CLOUD FIRESTORE LOGIC ---

// Fetch user profile from `/users/{userId}`
export async function getUserProfile(userId: string) {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// Save user profile to `/users/{userId}`
export async function saveUserProfile(
  userId: string, 
  profile: { name: string; email: string; role: 'organizer' | 'spectator'; favoriteTeamId: string | null }
) {
  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, 'users', userId), {
      uid: userId,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      favoriteTeamId: profile.favoriteTeamId,
      createdAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Sync tournament to Firestore at `/tournaments/{tournamentId}`
export async function syncTournamentToCloud(
  tournament: Tournament,
  ownerId: string,
  extraData: { teams: Team[]; players: Player[]; referees: Referee[] }
) {
  const path = `tournaments/${tournament.id}`;
  try {
    const docRef = doc(db, 'tournaments', tournament.id);
    
    // Check if tournament exists to maintain createdAt
    const existingSnap = await getDoc(docRef);
    const exists = existingSnap.exists();
    
    const docPayload: any = {
      id: tournament.id,
      name: tournament.name,
      organizerName: tournament.organizerName,
      ownerId: ownerId,
      drawType: tournament.drawType,
      participatingTeamIds: tournament.participatingTeamIds || [],
      teams: extraData.teams || [],
      players: extraData.players || [],
      referees: extraData.referees || [],
      matches: tournament.matches || [],
      updatedAt: Timestamp.now()
    };
    
    if (!exists) {
      docPayload.createdAt = Timestamp.now();
    } else {
      docPayload.createdAt = existingSnap.data()?.createdAt || Timestamp.now();
    }
    
    await setDoc(docRef, docPayload);
    console.log(`Tournament ${tournament.id} synchronised successfully to cloud.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Fetch single tournament from Firestore
export async function getTournamentFromCloud(tournamentId: string): Promise<any | null> {
  const path = `tournaments/${tournamentId}`;
  try {
    const snap = await getDoc(doc(db, 'tournaments', tournamentId));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// Listen to tournament in real-time
export function listenToTournamentFromCloud(
  tournamentId: string,
  onUpdate: (data: any) => void,
  onError?: (err: any) => void
) {
  const path = `tournaments/${tournamentId}`;
  const docRef = doc(db, 'tournaments', tournamentId);
  
  return onSnapshot(
    docRef, 
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data());
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
  );
}

// Delete tournament from Firestore
export async function deleteTournamentFromCloud(tournamentId: string) {
  const path = `tournaments/${tournamentId}`;
  try {
    await deleteDoc(doc(db, 'tournaments', tournamentId));
    console.log(`Tournament ${tournamentId} successfully deleted from cloud.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
