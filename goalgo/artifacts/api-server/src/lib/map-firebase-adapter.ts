import { createRequire } from "node:module";
import getFirebaseAdmin, { isFirebaseAdminConfigured } from "./firebase.js";

const require = createRequire(import.meta.url);

export type MapFirebaseBackendMode = "disabled" | "mirror" | "firestore";

type MapIdentity = {
  userId: string | null;
  deviceId: string | null;
};

type MapStateRow = Record<string, unknown> & {
  id?: string | null;
  slug?: string | null;
  userId?: string | null;
  deviceId?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type FirestoreDocumentSnapshotLike = {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
};

type FirestoreQuerySnapshotLike = {
  docs: FirestoreDocumentSnapshotLike[];
};

type FirestoreDocumentReferenceLike = {
  set(data: Record<string, unknown>, options?: { merge?: boolean }): Promise<unknown>;
  delete(): Promise<unknown>;
  get(): Promise<FirestoreDocumentSnapshotLike>;
};

type FirestoreQueryLike = {
  where(fieldPath: string, opStr: "==", value: string): FirestoreQueryLike;
  orderBy(fieldPath: string, directionStr?: "asc" | "desc"): FirestoreQueryLike;
  limit(limit: number): FirestoreQueryLike;
  get(): Promise<FirestoreQuerySnapshotLike>;
};

type FirestoreCollectionReferenceLike = FirestoreQueryLike & {
  doc(path?: string): FirestoreDocumentReferenceLike;
};

type FirestoreLike = {
  collection(path: string): FirestoreCollectionReferenceLike;
};

type FirebaseAdminLike = {
  firestore(app?: unknown): FirestoreLike;
};

const DEFAULT_COLLECTION_PREFIX = "yekpare_maps";

function normalizeMode(value: string | undefined): MapFirebaseBackendMode {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "mirror" || raw === "firestore") return raw;
  return "disabled";
}

export function getMapFirebaseBackendMode(): MapFirebaseBackendMode {
  return normalizeMode(process.env["YEKPARE_MAP_FIREBASE_BACKEND"] ?? process.env["MAP_FIREBASE_BACKEND"]);
}

export function getMapFirebaseStatus(): {
  mode: MapFirebaseBackendMode;
  configured: boolean;
  collections: Record<"savedPlaces" | "userPlaceDrafts" | "shareStates" | "businesses", string>;
  requiredEnv: string[];
} {
  return {
    mode: getMapFirebaseBackendMode(),
    configured: isFirebaseAdminConfigured(),
    collections: collectionNames(),
    requiredEnv: [
      "YEKPARE_MAP_FIREBASE_BACKEND=mirror|firestore",
      "GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON",
      "FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY",
      "YEKPARE_MAP_FIREBASE_COLLECTION_PREFIX (optional)",
    ],
  };
}

export function shouldReadMapStateFromFirebase(): boolean {
  return getMapFirebaseBackendMode() === "firestore" && isFirebaseAdminConfigured();
}

function collectionNames() {
  const prefix = String(process.env["YEKPARE_MAP_FIREBASE_COLLECTION_PREFIX"] ?? DEFAULT_COLLECTION_PREFIX)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_") || DEFAULT_COLLECTION_PREFIX;
  return {
    savedPlaces: `${prefix}_saved_places`,
    userPlaceDrafts: `${prefix}_user_place_drafts`,
    shareStates: `${prefix}_share_states`,
    businesses: `${prefix}_businesses`,
  };
}

function getFirestore(): FirestoreLike | null {
  if (getMapFirebaseBackendMode() === "disabled" || !isFirebaseAdminConfigured()) return null;
  const app = getFirebaseAdmin();
  if (!app) return null;
  const admin = require("firebase-admin") as FirebaseAdminLike;
  return admin?.firestore(app) ?? null;
}

function normalizeFirestoreValue(value: unknown): unknown {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (Array.isArray(value)) return value.map(normalizeFirestoreValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = normalizeFirestoreValue(child);
    }
    return out;
  }
  return value;
}

function plainRow(row: MapStateRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) out[key] = value;
  }
  out["firebaseSyncedAt"] = new Date();
  return out;
}

function fromSnapshot(doc: FirestoreDocumentSnapshotLike): MapStateRow | null {
  if (!doc.exists) return null;
  const data = doc.data();
  if (!data) return null;
  const normalized = normalizeFirestoreValue(data) as Record<string, unknown>;
  return { id: String(normalized["id"] ?? doc.id), ...normalized };
}

function ownsRow(row: MapStateRow, identity: MapIdentity): boolean {
  return Boolean(
    (identity.userId && row.userId === identity.userId) ||
    (identity.deviceId && row.deviceId === identity.deviceId),
  );
}

async function listOwnedRows(collectionName: string, identity: MapIdentity): Promise<MapStateRow[] | null> {
  if (!shouldReadMapStateFromFirebase()) return null;
  const firestore = getFirestore();
  if (!firestore) return null;

  const byId = new Map<string, MapStateRow>();
  const queries: Promise<FirestoreQuerySnapshotLike>[] = [];
  const collection = firestore.collection(collectionName);
  if (identity.userId) {
    queries.push(collection.where("userId", "==", identity.userId).limit(240).get());
  }
  if (identity.deviceId) {
    queries.push(collection.where("deviceId", "==", identity.deviceId).limit(240).get());
  }
  const snapshots = await Promise.all(queries);
  for (const snapshot of snapshots) {
    for (const doc of snapshot.docs) {
      const row = fromSnapshot(doc);
      if (row?.id && ownsRow(row, identity)) byId.set(String(row.id), row);
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => new Date(String(b.createdAt ?? 0)).getTime() - new Date(String(a.createdAt ?? 0)).getTime())
    .slice(0, 120);
}

async function getRowByDocId(collectionName: string, id: string): Promise<MapStateRow | null> {
  const firestore = getFirestore();
  if (!firestore) return null;
  const snap = await firestore.collection(collectionName).doc(id).get();
  return fromSnapshot(snap);
}

async function writeRow(collectionName: string, row: MapStateRow): Promise<boolean> {
  const firestore = getFirestore();
  const id = String(row.id ?? row.slug ?? "").trim();
  if (!firestore || !id) return false;
  await firestore.collection(collectionName).doc(id).set(plainRow({ ...row, id }), { merge: true });
  return true;
}

async function deleteOwnedRow(collectionName: string, id: string, identity: MapIdentity): Promise<boolean> {
  const firestore = getFirestore();
  if (!firestore || !id) return false;
  const row = await getRowByDocId(collectionName, id);
  if (!row || !ownsRow(row, identity)) return false;
  await firestore.collection(collectionName).doc(id).delete();
  return true;
}

export async function listFirebaseSavedPlaces(identity: MapIdentity): Promise<MapStateRow[] | null> {
  return listOwnedRows(collectionNames().savedPlaces, identity);
}

export async function mirrorFirebaseSavedPlace(row: MapStateRow): Promise<boolean> {
  return writeRow(collectionNames().savedPlaces, row);
}

export async function deleteFirebaseSavedPlace(id: string, identity: MapIdentity): Promise<boolean> {
  return deleteOwnedRow(collectionNames().savedPlaces, id, identity);
}

export async function listFirebaseUserPlaceDrafts(identity: MapIdentity): Promise<MapStateRow[] | null> {
  return listOwnedRows(collectionNames().userPlaceDrafts, identity);
}

export async function mirrorFirebaseUserPlaceDraft(row: MapStateRow): Promise<boolean> {
  return writeRow(collectionNames().userPlaceDrafts, row);
}

export async function deleteFirebaseUserPlaceDraft(id: string, identity: MapIdentity): Promise<boolean> {
  return deleteOwnedRow(collectionNames().userPlaceDrafts, id, identity);
}

export async function mirrorFirebaseShareState(row: MapStateRow): Promise<boolean> {
  return writeRow(collectionNames().shareStates, row);
}

export async function getFirebaseShareState(slug: string): Promise<MapStateRow | null> {
  if (!shouldReadMapStateFromFirebase()) return null;
  const firestore = getFirestore();
  if (!firestore || !slug) return null;
  const direct = await firestore.collection(collectionNames().shareStates).doc(slug).get();
  const directRow = fromSnapshot(direct);
  if (directRow) return directRow;
  const bySlug = await firestore.collection(collectionNames().shareStates).where("slug", "==", slug).limit(1).get();
  return bySlug.docs[0] ? fromSnapshot(bySlug.docs[0]) : null;
}
