import { getPhotosByStatus, updatePhotoStatus } from './idb';

const MAX_RETRIES = 5;
const BASE_DELAY = 2000;

export async function processUploadQueue() {
  // Get both pending and failed photos
  const pendingPhotos = await getPhotosByStatus('pending');
  const failedPhotos = await getPhotosByStatus('failed');
  
  const photosToUpload = [...pendingPhotos, ...failedPhotos];

  for (const photo of photosToUpload) {
    // Only try to upload if not already uploading
    if (photo.status === 'uploading') continue;

    try {
      // Mark as uploading to prevent duplicate attempts
      await updatePhotoStatus(photo.client_photo_id, 'uploading');

      const formData = new FormData();
      formData.append('file', photo.blob, `${photo.client_photo_id}.jpg`);
      formData.append('event_id', photo.event_id);
      formData.append('guest_id', photo.guest_id);
      formData.append('client_photo_id', photo.client_photo_id);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();

      // On success, mark as uploaded
      await updatePhotoStatus(photo.client_photo_id, 'uploaded', result.storage_key);
    } catch (error) {
      console.error('Failed to upload photo:', photo.client_photo_id, error);
      // Revert to failed so it can be retried later
      await updatePhotoStatus(photo.client_photo_id, 'failed');
    }
  }
}

// A simple hook or function to start the background worker
export function startUploadQueueWorker(intervalMs = 5000) {
  let isRunning = false;

  const worker = setInterval(async () => {
    // If online, attempt to process
    if (navigator.onLine && !isRunning) {
      isRunning = true;
      try {
        await processUploadQueue();
      } finally {
        isRunning = false;
      }
    }
  }, intervalMs);

  return () => clearInterval(worker);
}
