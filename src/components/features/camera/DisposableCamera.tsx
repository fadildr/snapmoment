"use client";

import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import JSZip from "jszip";
import { defaultPreset } from "@/lib/presets";
import { savePhotoLocally, getAllPhotos, PhotoRecord } from "@/lib/idb";
import { Camera, Zap, RefreshCcw, ImageIcon, X, Check, XCircle, Download, CheckSquare } from "lucide-react";

interface DisposableCameraProps {
  eventId: string;
}

export function DisposableCamera({ eventId }: DisposableCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photosTaken, setPhotosTaken] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState(false); // For screen overlay
  const [flashEnabled, setFlashEnabled] = useState(false); // For torch and logic
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<PhotoRecord[]>([]);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedForDownload, setSelectedForDownload] = useState<Set<string>>(new Set());

  const downloadSinglePhoto = (url: string) => {
    const guestName = localStorage.getItem("snapmoment_guest_name") || "tamu";
    const safeName = guestName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `snapmoment-${safeName}-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadSelectedPhotos = async () => {
    const photosToDownload = isSelectionMode && selectedForDownload.size > 0 
      ? galleryPhotos.filter(p => selectedForDownload.has(p.client_photo_id))
      : galleryPhotos;

    if (photosToDownload.length === 0) return;

    if (photosToDownload.length === 1) {
      const url = URL.createObjectURL(photosToDownload[0].blob);
      downloadSinglePhoto(url);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setIsSelectionMode(false);
      setSelectedForDownload(new Set());
      return;
    }

    try {
      const guestName = localStorage.getItem("snapmoment_guest_name") || "tamu";
      const safeName = guestName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

      const zip = new JSZip();
      photosToDownload.forEach((photo, index) => {
        zip.file(`snapmoment-${safeName}-${index + 1}-${photo.taken_at}.jpg`, photo.blob);
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `snapmoment-gallery-${safeName}-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setIsSelectionMode(false);
      setSelectedForDownload(new Set());
    } catch (err) {
      console.error("Error creating zip:", err);
      alert("Gagal mengunduh foto.");
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedForDownload(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

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
      if (videoRef.current && videoRef.current.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach((track) => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
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
      if (videoRef.current && videoRef.current.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Reactively apply torch (physical flash) if supported when stream or flashEnabled changes
  useEffect(() => {
    const track = stream?.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
        if (capabilities?.torch) {
          track.applyConstraints({ advanced: [{ torch: flashEnabled } as any] }).catch(console.warn);
        }
      } catch (err) {
        console.warn("Torch not supported", err);
      }
    }
  }, [stream, flashEnabled]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;

    setIsCapturing(true);

    // Screen flash effect if flash is enabled
    if (flashEnabled) {
      setFlash(true);
      setTimeout(() => setFlash(false), 100);
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions to match video stream
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply the preset filter to the context before drawing
    ctx.filter = defaultPreset.cssFilter;
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Reset filter and transform
    if (facingMode === "user") {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
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

        // Show preview instead of immediately saving
        setPreviewBlob(compressedFile);
      } catch (error) {
        console.error("Error saving photo locally:", error);
        alert("Gagal menyimpan foto. Memori mungkin penuh.");
      } finally {
        setIsCapturing(false);
      }
    }, "image/jpeg", 0.95);
  };

  const confirmPhoto = async () => {
    if (!previewBlob) return;
    try {
      const client_photo_id = crypto.randomUUID();
      await savePhotoLocally({
        client_photo_id,
        event_id: eventId,
        guest_id: guestId,
        blob: previewBlob,
        status: "pending",
        taken_at: Date.now(),
      });
      setPhotosTaken((prev) => prev + 1);
    } catch (error) {
      console.error("Error saving photo locally:", error);
      alert("Gagal menyimpan foto. Memori mungkin penuh.");
    } finally {
      setPreviewBlob(null);
    }
  };

  const retakePhoto = () => {
    setPreviewBlob(null);
  };

  const openGallery = async () => {
    try {
      const photos = await getAllPhotos();
      photos.sort((a, b) => b.taken_at - a.taken_at);
      setGalleryPhotos(photos);
      setShowGallery(true);
    } catch (err) {
      console.error("Failed to load gallery", err);
    }
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
          {/* Flash toggle UI */}
          <button 
            onClick={() => setFlashEnabled((prev) => !prev)}
            className={`w-12 h-6 rounded-full border-2 border-black flex items-center px-1 shadow-inner transition-colors ${
              flashEnabled ? "bg-green-500 justify-end" : "bg-red-600 justify-start"
            }`}
          >
            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
              <Zap size={10} className={flashEnabled ? "text-green-500" : "text-red-600"} />
            </div>
          </button>

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
            className={`absolute inset-0 w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
            style={{ filter: defaultPreset.cssFilter }} // Show filter live in preview
          />
          {/* Viewfinder Reticle */}
          <div className="absolute inset-0 pointer-events-none opacity-30 flex items-center justify-center">
             <div className="w-1/2 h-1/2 border border-white border-dashed opacity-50 rounded-lg"></div>
          </div>
          {/* Preview Overlay */}
          {previewBlob && (
            <div className="absolute inset-0 z-20 bg-black flex flex-col">
               <img 
                 src={URL.createObjectURL(previewBlob)} 
                 className="absolute inset-0 w-full h-full object-cover" 
                 alt="Preview" 
               />
               <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                 <button onClick={retakePhoto} className="flex flex-col items-center justify-center p-2 text-white/80 hover:text-white drop-shadow-md">
                   <XCircle size={36} className="text-red-400 mb-1" />
                   <span className="text-[10px] font-bold">BUANG</span>
                 </button>
                 <button onClick={confirmPhoto} className="flex flex-col items-center justify-center p-2 text-white/80 hover:text-white drop-shadow-md">
                   <Check size={44} className="text-green-400 mb-1" />
                   <span className="text-[10px] font-bold shadow-black">SIMPAN</span>
                 </button>
               </div>
            </div>
          )}

          {/* Camera Switch button */}
          <button 
            onClick={toggleCamera}
            className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full backdrop-blur-sm z-10 hover:bg-black/70 transition-colors"
          >
            <RefreshCcw size={16} />
          </button>
        </div>

        {/* Hidden Canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Shutter Button area */}
        <div className="mt-8 relative w-full flex items-center justify-center">
          <div className="flex-1 flex justify-center">
             <button onClick={openGallery} className="w-12 h-12 bg-neutral-800 rounded-full border-2 border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white active:bg-neutral-700 transition-colors shadow-inner">
               <ImageIcon size={20} />
             </button>
          </div>
          <button
            onClick={capturePhoto}
            disabled={isCapturing || !!previewBlob}
            className="w-24 h-24 shrink-0 rounded-full bg-red-600 border-[6px] border-black shadow-[0_4px_0_rgb(0,0,0),inset_0_-4px_8px_rgba(0,0,0,0.3),inset_0_4px_8px_rgba(255,255,255,0.4)] active:translate-y-1 active:shadow-[0_0px_0_rgb(0,0,0),inset_0_-2px_4px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center disabled:opacity-50"
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
      {/* Fullscreen Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-4 flex justify-between items-center bg-neutral-900 border-b border-neutral-800 shrink-0">
            <h2 className="text-xl font-bold text-white">
              {isSelectionMode ? `${selectedForDownload.size} Dipilih` : "Galeri Anda"}
            </h2>
            <div className="flex items-center gap-2">
              {galleryPhotos.length > 0 && (
                <>
                  <button 
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      if (isSelectionMode) setSelectedForDownload(new Set());
                    }} 
                    className={`p-2 rounded-full text-white transition-colors ${isSelectionMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-neutral-800 hover:bg-neutral-700'}`}
                  >
                    <CheckSquare size={20} />
                  </button>
                  <button 
                    onClick={downloadSelectedPhotos} 
                    disabled={isSelectionMode && selectedForDownload.size === 0}
                    className="p-2 bg-neutral-800 rounded-full text-white hover:bg-neutral-700 transition-colors disabled:opacity-50"
                  >
                    <Download size={20} />
                  </button>
                </>
              )}
              <button onClick={() => {
                setShowGallery(false);
                setIsSelectionMode(false);
                setSelectedForDownload(new Set());
              }} className="p-2 bg-neutral-800 rounded-full text-white hover:bg-neutral-700 transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {galleryPhotos.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-sm">
                <ImageIcon size={48} className="mb-4 opacity-50" />
                Belum ada foto yang disimpan.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {galleryPhotos.map((p) => {
                  const url = URL.createObjectURL(p.blob);
                  const isSelected = selectedForDownload.has(p.client_photo_id);
                  return (
                    <div 
                      key={p.client_photo_id} 
                      onClick={() => {
                        if (isSelectionMode) {
                          toggleSelection(p.client_photo_id);
                        } else {
                          setSelectedPhotoUrl(url);
                        }
                      }} 
                      className={`cursor-pointer aspect-square bg-neutral-800 rounded-lg overflow-hidden relative shadow-md transition-all ${isSelected ? 'ring-2 ring-blue-500 scale-95 opacity-80' : ''}`}
                    >
                      <img src={url} className="w-full h-full object-cover" alt="Saved photo" />
                      {isSelectionMode && isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                          <div className="bg-blue-500 rounded-full p-1 text-white">
                            <Check size={20} />
                          </div>
                        </div>
                      )}
                      {p.status === 'pending' && <div className="absolute top-1 right-1 bg-yellow-500 w-2 h-2 rounded-full shadow-sm" />}
                      {p.status === 'uploading' && <div className="absolute top-1 right-1 bg-blue-500 w-2 h-2 rounded-full animate-pulse shadow-sm" />}
                      {p.status === 'uploaded' && <div className="absolute top-1 right-1 bg-green-500 w-2 h-2 rounded-full shadow-sm" />}
                      {p.status === 'failed' && <div className="absolute top-1 right-1 bg-red-500 w-2 h-2 rounded-full shadow-sm" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fullscreen Photo Preview from Gallery */}
          {selectedPhotoUrl && (
            <div className="fixed inset-0 z-[110] bg-black flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-4 flex justify-end absolute top-0 w-full z-10 gap-2">
                <button onClick={() => downloadSinglePhoto(selectedPhotoUrl)} className="p-2 bg-neutral-800/80 rounded-full text-white backdrop-blur-md hover:bg-neutral-700/80 transition-colors">
                  <Download size={20} />
                </button>
                <button onClick={() => setSelectedPhotoUrl(null)} className="p-2 bg-neutral-800/80 rounded-full text-white backdrop-blur-md hover:bg-neutral-700/80 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <img src={selectedPhotoUrl} className="w-full h-full object-contain" alt="Full preview" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
