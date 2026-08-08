"use client";

import { useEffect, useState } from "react";
import { DisposableCamera } from "@/components/features/camera/DisposableCamera";
import { getPhotosByStatus } from "@/lib/idb";
import { startUploadQueueWorker } from "@/lib/upload-queue";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { use } from "react";

export default function EventCameraPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Initial online check
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Start background upload worker
    const stopWorker = startUploadQueueWorker(3000);

    // Poll IndexedDB for pending photo count to update UI
    const countInterval = setInterval(async () => {
      const pending = await getPhotosByStatus("pending");
      const uploading = await getPhotosByStatus("uploading");
      const failed = await getPhotosByStatus("failed");
      setPendingCount(pending.length + uploading.length + failed.length);
    }, 2000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      stopWorker();
      clearInterval(countInterval);
    };
  }, []);

  return (
    <main className="flex flex-col min-h-screen bg-neutral-950">
      {/* Top Status Bar */}
      <div className="fixed top-0 left-0 right-0 p-4 z-50 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center space-x-2">
           <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
           <span className="text-xs font-mono font-bold uppercase text-white/70 tracking-widest">
             {isOnline ? 'Online' : 'Offline'}
           </span>
        </div>
        
        {/* Upload Status Badge */}
        {pendingCount > 0 && (
          <div className="bg-black/80 backdrop-blur border border-white/10 rounded-full px-3 py-1.5 flex items-center space-x-2 shadow-lg">
            {isOnline ? <Loader2 size={12} className="animate-spin text-white" /> : <CloudOff size={12} className="text-red-400" />}
            <span className="text-xs font-medium text-white">
              {pendingCount} mending
            </span>
          </div>
        )}
        {pendingCount === 0 && (
          <div className="bg-black/40 backdrop-blur border border-white/10 rounded-full px-3 py-1.5 flex items-center space-x-2">
            <Cloud size={12} className="text-green-400" />
            <span className="text-xs font-medium text-white/50">Semua tersimpan</span>
          </div>
        )}
      </div>

      {/* Main Camera View */}
      <DisposableCamera eventId={slug} />
    </main>
  );
}
