const DB_NAME = 'P2PTransferStorage';
const DB_VERSION = 1;
const STORE_NAME = 'file_chunks';

export async function deriveSecretKey(roomId) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(roomId), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('P2P_FILE_SALT_STATIC'), iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptChunk(arrayBuffer, cryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, arrayBuffer);
  const packed = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(ciphertext), iv.byteLength);
  return packed.buffer;
}

export async function decryptChunk(packedBuffer, cryptoKey) {
  const iv = packedBuffer.slice(0, 12);
  const ciphertext = packedBuffer.slice(12);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, cryptoKey, ciphertext);
}

export async function calculateFileHash(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: ['fileHash', 'chunkIndex'] });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function writeChunkToDB(db, fileHash, chunkIndex, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ fileHash, chunkIndex, data });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function compileFileFromDB(db, fileHash, totalChunks) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const chunks = [];
    let currentIdx = 0;

    function fetchNext() {
      if (currentIdx === totalChunks) {
        resolve(new Blob(chunks));
        return;
      }
      const request = store.get([fileHash, currentIdx]);
      request.onsuccess = (e) => {
        if (e.target.result) {
          chunks.push(e.target.result.data);
          currentIdx++;
          fetchNext();
        } else {
          reject(new Error(`Missing block indices at index: ${currentIdx}`));
        }
      };
      request.onerror = () => reject(request.error);
    }
    fetchNext();
  });
}