import { compileFileFromDB } from './transferUtils';

export async function processAndVerifyPayload({ metadata, db, onStateChange }) {
  onStateChange({ status: 'reconstructing', progress: 100 });
  try {
    const completedBlob = await compileFileFromDB(db, metadata.hash, metadata.chunkCount);
    const arrayBuffer = await completedBlob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const computedHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (computedHash !== metadata.hash) {
      throw new Error('INTEGRITY_MISMATCH');
    }

    const downloadUrl = URL.createObjectURL(completedBlob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = metadata.filename;
    document.body.appendChild(anchor);
    anchor.click();
    
    document.body.removeChild(anchor);
    URL.revokeObjectURL(downloadUrl);

    const tx = db.transaction('file_chunks', 'readwrite');
    tx.objectStore('file_chunks').clear();

    onStateChange({ status: 'completed', progress: 100 });
  } catch (error) {
    onStateChange({ 
      status: 'failed', 
      errorReason: error.message === 'INTEGRITY_MISMATCH' 
        ? 'Data corruption detected: Verification hash mismatch.' 
        : 'Failed to assemble binary blocks.' 
    });
  }
}