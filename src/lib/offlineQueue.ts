import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface QueuedPhoto {
  id: string;
  assetId: string;
  file: Blob;
  fileName: string;
  tag: string;
  latitude?: number;
  longitude?: number;
  timestamp: number;
  status: 'pending' | 'uploading' | 'failed';
  retryCount: number;
}

interface OfflineDB extends DBSchema {
  photos: {
    key: string;
    value: QueuedPhoto;
    indexes: { 'by-status': string; 'by-asset': string };
  };
}

let db: IDBPDatabase<OfflineDB> | null = null;

async function getDB() {
  if (!db) {
    db = await openDB<OfflineDB>('offline-uploads', 1, {
      upgrade(database) {
        const store = database.createObjectStore('photos', { keyPath: 'id' });
        store.createIndex('by-status', 'status');
        store.createIndex('by-asset', 'assetId');
      },
    });
  }
  return db;
}

export async function addToQueue(photo: Omit<QueuedPhoto, 'id' | 'timestamp' | 'status' | 'retryCount'>) {
  const database = await getDB();
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  await database.add('photos', {
    ...photo,
    id,
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
  });
  
  return id;
}

export async function getQueuedPhotos(status?: 'pending' | 'uploading' | 'failed') {
  const database = await getDB();
  
  if (status) {
    return database.getAllFromIndex('photos', 'by-status', status);
  }
  
  return database.getAll('photos');
}

export async function updatePhotoStatus(id: string, status: 'pending' | 'uploading' | 'failed') {
  const database = await getDB();
  const photo = await database.get('photos', id);
  
  if (photo) {
    photo.status = status;
    if (status === 'failed') {
      photo.retryCount++;
    }
    await database.put('photos', photo);
  }
}

export async function removeFromQueue(id: string) {
  const database = await getDB();
  await database.delete('photos', id);
}

export async function getQueueCount() {
  const database = await getDB();
  return database.count('photos');
}

export async function clearQueue() {
  const database = await getDB();
  await database.clear('photos');
}
