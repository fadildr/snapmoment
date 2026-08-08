"use client";

import { useEffect, useState } from "react";
import { DisposableCamera } from "@/components/features/camera/DisposableCamera";
import { getPhotosByStatus } from "@/lib/idb";
import { startUploadQueueWorker } from "@/lib/upload-queue";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { use } from "react";
import { useRouter } from "next/navigation";

export default function EventCameraPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  const router = useRouter();

  useEffect(() => {
    // Check if guest already entered name
    const savedName = localStorage.getItem("snapmoment_guest_name");
    if (!savedName) {
      // Redirect to root page if no name is found
      router.push("/");
      return;
    }
    setIsChecking(false);

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


  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950">
        <Loader2 className="animate-spin text-[#FFD700]" size={32} />
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen bg-neutral-950">
      {/* Top Status Bar */}
      {/* Main Camera View */}
      <DisposableCamera eventId={slug} isOnline={isOnline} pendingCount={pendingCount} />
    </main>
  );
}
