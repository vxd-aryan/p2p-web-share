import { calculateFileHash, deriveSecretKey, encryptChunk } from '../utils/transferUtils';

const CHUNK_SIZE = 64 * 1024; 
const BUFFER_THRESHOLD_HIGH = 16 * 1024 * 1024; 

export class FileSender {
  constructor(dataChannel, roomId) {
    this.channel = dataChannel;
    this.roomId = roomId;
    this.channel.bufferedAmountLowThreshold = 4 * 1024 * 1024; 
  }

  async send(file, onProgress) {
    const cryptoKey = await deriveSecretKey(this.roomId);
    const fileHash = await calculateFileHash(file);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    this.channel.send(JSON.stringify({
      type: 'METADATA', filename: file.name, size: file.size, chunkCount: totalChunks, hash: fileHash
    }));

    const stream = file.stream();
    const reader = stream.getReader();
    let chunkIndex = 0;

    try {
      while (true) {
        if (this.channel.bufferedAmount > BUFFER_THRESHOLD_HIGH) {
          await new Promise((resolve) => {
            this.channel.onbufferedamountlow = () => {
              this.channel.onbufferedamountlow = null;
              resolve();
            };
          });
        }

        const { done, value } = await reader.read();
        if (done) break;

        let offset = 0;
        while (offset < value.length) {
          const slice = value.buffer.slice(offset, offset + CHUNK_SIZE);
          const encryptedData = await encryptChunk(slice, cryptoKey);
          this.channel.send(encryptedData);

          offset += CHUNK_SIZE;
          chunkIndex++;
          if (onProgress) onProgress(Math.round((chunkIndex / totalChunks) * 100));
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}