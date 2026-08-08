import { openDB, DBSchema, IDBPDatabase } from 'idb';

export type PhotoStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export interface PhotoRecord {
  client_photo_id: string; // Used as the primary key and idempotency key
  event_id: string;
  guest_id: string;
  blob: Blob;
  status: PhotoStatus;
  taken_at: number; // timestamp
  storage_key?: string; // Once uploaded
}

interface SnapMomentDB extends DBSchema {
  photos: {
    key: string;
    value: PhotoRecord;
    indexes: {
      'by-status': string;
    };
  };
}

const DB_NAME = 'snapmoment-db';
const STORE_NAME = 'photos';

let dbPromise: Promise<IDBPDatabase<SnapMomentDB>> | null = null;

export async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<SnapMomentDB>(DB_NAME, 1, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'client_photo_id',
        });
        store.createIndex('by-status', 'status');
      },
    });
  }
  return dbPromise;
}

export async function savePhotoLocally(photo: PhotoRecord) {
  const db = await getDB();
  await db.put(STORE_NAME, photo);
}

export async function getPhotosByStatus(status: PhotoStatus) {
  const db = await getDB();
  return db.getAllFromIndex(STORE_NAME, 'by-status', status);
}

export async function updatePhotoStatus(client_photo_id: string, status: PhotoStatus, storage_key?: string) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const photo = await store.get(client_photo_id);
  if (photo) {
    photo.status = status;
    if (storage_key) {
      photo.storage_key = storage_key;
    }
    await store.put(photo);
  }
  await tx.done;
}

export async function getAllPhotos() {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}
