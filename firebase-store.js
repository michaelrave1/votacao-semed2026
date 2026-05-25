import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAnalytics,
  isSupported as isAnalyticsSupported,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  doc,
  getFirestore,
  onSnapshot,
  runTransaction,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDUGSaaW_z4NQxqzXH90MQlijElNHDNuTw",
  authDomain: "votacao-diretores2026.firebaseapp.com",
  projectId: "votacao-diretores2026",
  storageBucket: "votacao-diretores2026.firebasestorage.app",
  messagingSenderId: "312627708775",
  appId: "1:312627708775:web:186f3e944bf962c756a5c2",
  measurementId: "G-JY04QMQ9D3",
};

const STATE_COLLECTION = "urnaState";
const STATE_DOCUMENT_ID = "current";
const stateRef = doc(getFirestore(initializeApp(firebaseConfig)), STATE_COLLECTION, STATE_DOCUMENT_ID);

export const firebaseServices = {
  app: stateRef.firestore.app,
  auth: getAuth(stateRef.firestore.app),
  firestore: stateRef.firestore,
  database: getDatabase(stateRef.firestore.app),
  analytics: null,
};

window.firebaseServices = firebaseServices;

try {
  if (await isAnalyticsSupported()) {
    firebaseServices.analytics = getAnalytics(firebaseServices.app);
  }
} catch (error) {
  console.warn("Nao foi possivel inicializar o Firebase Analytics.", error);
}

export function createEmptyElectionState() {
  return {
    settings: {
      title: "Urna Escolar",
    },
    units: [],
    accessAccounts: [],
    candidates: [],
    boothAssignments: [],
    votingSessions: [],
    votes: [],
  };
}

function normalizeElectionState(rawState) {
  const emptyState = createEmptyElectionState();
  if (!rawState || typeof rawState !== "object") {
    return emptyState;
  }

  return {
    settings:
      rawState.settings && typeof rawState.settings === "object"
        ? {
            ...emptyState.settings,
            ...rawState.settings,
          }
        : emptyState.settings,
    units: Array.isArray(rawState.units) ? rawState.units : [],
    accessAccounts: Array.isArray(rawState.accessAccounts) ? rawState.accessAccounts : [],
    candidates: Array.isArray(rawState.candidates) ? rawState.candidates : [],
    boothAssignments: Array.isArray(rawState.boothAssignments) ? rawState.boothAssignments : [],
    votingSessions: Array.isArray(rawState.votingSessions) ? rawState.votingSessions : [],
    votes: Array.isArray(rawState.votes) ? rawState.votes : [],
  };
}

function cloneElectionState(state) {
  return JSON.parse(JSON.stringify(state));
}

function stampElectionState(state) {
  return {
    ...normalizeElectionState(state),
    updatedAt: new Date().toISOString(),
  };
}

export async function ensureElectionSeed(seedState) {
  await runTransaction(firebaseServices.firestore, async (transaction) => {
    const snapshot = await transaction.get(stateRef);
    if (snapshot.exists()) {
      return;
    }

    transaction.set(stateRef, {
      ...stampElectionState(seedState),
      seededAt: new Date().toISOString(),
    });
  });
}

export function subscribeToElectionState({ onChange, onReady, onError }) {
  let didSignalReady = false;

  return onSnapshot(
    stateRef,
    (snapshot) => {
      const nextState = snapshot.exists()
        ? normalizeElectionState(snapshot.data())
        : createEmptyElectionState();

      onChange(nextState);

      if (!didSignalReady) {
        didSignalReady = true;
        if (typeof onReady === "function") {
          onReady(nextState);
        }
      }
    },
    (error) => {
      if (typeof onError === "function") {
        onError(error);
      }
    },
  );
}

export async function replaceElectionState(nextState) {
  await setDoc(stateRef, stampElectionState(nextState));
}

export async function runElectionStateTransaction(mutator) {
  return runTransaction(firebaseServices.firestore, async (transaction) => {
    const snapshot = await transaction.get(stateRef);
    const currentState = snapshot.exists()
      ? normalizeElectionState(snapshot.data())
      : createEmptyElectionState();
    const draftState = cloneElectionState(currentState);
    const result = await mutator(draftState, currentState);

    transaction.set(stateRef, stampElectionState(draftState));
    return result;
  });
}
