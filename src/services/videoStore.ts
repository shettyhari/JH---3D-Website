/**
 * Local IndexedDB media store for real-human 360° turnaround videos (MP4/WebM/MOV).
 * Keeps large video blobs out of localStorage so the product catalog stays fast and within quota.
 */

const DB_NAME = 'jhonty_hub_media_db_v1';
const STORE_NAME = 'showroom_videos';

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this browser.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open media database.'));
  });
}

export async function saveShowroomVideo(file: Blob): Promise<string> {
  const db = await openMediaDb();
  const id = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(file, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to store video.'));
  });
  db.close();
  return id;
}

export async function getShowroomVideoBlob(videoId: string): Promise<Blob | null> {
  if (!videoId) return null;
  try {
    const db = await openMediaDb();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(videoId);
      req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error('Failed to load video.'));
    });
    db.close();
    return blob;
  } catch {
    return null;
  }
}

export async function deleteShowroomVideo(videoId: string): Promise<void> {
  if (!videoId) return;
  try {
    const db = await openMediaDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(videoId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to delete video.'));
    });
    db.close();
  } catch {
    // Non-fatal cleanup error
  }
}
