"use client";

import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { defaultPreset } from "@/lib/presets";
import { savePhotoLocally } from "@/lib/idb";
import { Camera, Zap, RefreshCcw } from "lucide-react";

interface DisposableCameraProps {
  eventId: string;
}

export function DisposableCamera({ eventId }: DisposableCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photosTaken, setPhotosTaken] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState(false);

  // Fallback device id
  const [guestId, setGuestId] = useState("");

  useEffect(() => {
    // Generate simple guest/device ID
    let id = localStorage.getItem("snapmoment_guest_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("snapmoment_guest_id", id);
    }
    setGuestId(id);
  }, []);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Gagal mengakses kamera. Pastikan izin diberikan.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;

    setIsCapturing(true);

    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 100);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions to match video stream
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply the preset filter to the context before drawing
    ctx.filter = defaultPreset.cssFilter;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Reset filter
    ctx.filter = "none";

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsCapturing(false);
        return;
      }

      try {
        // Compress the image
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(new File([blob], "photo.jpg", { type: "image/jpeg" }), options);

        const client_photo_id = crypto.randomUUID();
        await savePhotoLocally({
          client_photo_id,
          event_id: eventId,
          guest_id: guestId,
          blob: compressedFile,
          status: "pending",
          taken_at: Date.now(),
        });

        setPhotosTaken((prev) => prev + 1);
      } catch (error) {
        console.error("Error saving photo locally:", error);
        alert("Gagal menyimpan foto. Memori mungkin penuh.");
      } finally {
        setIsCapturing(false);
      }
    }, "image/jpeg", 0.95);
  };

  return (
    <div
      className="flex-1 w-full flex flex-col items-center justify-center p-4 relative touch-none"
      style={{ backgroundColor: defaultPreset.cameraBodyColor }}
    >
      {/* Flash overlay */}
      {flash && <div className="absolute inset-0 bg-white z-50 pointer-events-none opacity-80" />}

      {/* Disposable Camera UI Wrapper */}
      <div className="w-full max-w-sm aspect-[3/4] bg-neutral-900 rounded-[40px] p-6 shadow-2xl relative flex flex-col items-center border-[8px] border-black overflow-hidden">
        
        {/* Top bar (Counter & Viewfinder accent) */}
        <div className="w-full flex justify-between items-start mb-6">
          {/* Fake Flash toggle UI (esthetic) */}
          <div className="w-12 h-6 bg-red-600 rounded-full border-2 border-black flex items-center justify-end px-1 shadow-inner">
            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
              <Zap size={10} className="text-red-600" />
            </div>
          </div>

          {/* Frame Counter */}
          <div className="bg-black text-[#FFD700] font-mono text-xl px-3 py-1 rounded-sm shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)] border-2 border-neutral-700 font-bold tracking-widest bg-opacity-80 flex items-center">
            {String(photosTaken).padStart(2, "0")}
            <span className="text-xs ml-1 opacity-50">EXP</span>
          </div>
        </div>

        {/* Viewfinder (Video element) */}
        <div className="relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden border-4 border-neutral-800 shadow-inner">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: defaultPreset.cssFilter }} // Show filter live in preview
          />
          {/* Viewfinder Reticle */}
          <div className="absolute inset-0 pointer-events-none opacity-30 flex items-center justify-center">
             <div className="w-1/2 h-1/2 border border-white border-dashed opacity-50 rounded-lg"></div>
          </div>
          {/* Refresh camera button (in case video freezes/fails) */}
          <button 
            onClick={startCamera}
            className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full backdrop-blur-sm z-10"
          >
            <RefreshCcw size={16} />
          </button>
        </div>

        {/* Hidden Canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Shutter Button area */}
        <div className="mt-8 relative w-full flex justify-center">
          <button
            onClick={capturePhoto}
            disabled={isCapturing}
            className="w-24 h-24 rounded-full bg-red-600 border-[6px] border-black shadow-[0_4px_0_rgb(0,0,0),inset_0_-4px_8px_rgba(0,0,0,0.3),inset_0_4px_8px_rgba(255,255,255,0.4)] active:translate-y-1 active:shadow-[0_0px_0_rgb(0,0,0),inset_0_-2px_4px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center disabled:opacity-50"
          >
            <Camera className="text-black opacity-30" size={32} />
          </button>
        </div>
        
        {/* Branding/Text */}
        <div className="mt-auto pt-4 text-center">
          <p className="font-black text-2xl tracking-tighter text-black uppercase opacity-20 transform -skew-x-6">
            SnapMoment
          </p>
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">
            {defaultPreset.name}
          </p>
        </div>
      </div>
    </div>
  );
}
