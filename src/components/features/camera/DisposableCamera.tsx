"use client";

import { useEffect, useRef, useState, useMemo } from "react";

import JSZip from "jszip";
import { defaultPreset, presets, Preset } from "@/lib/presets";
import { savePhotoLocally, getAllPhotos, PhotoRecord } from "@/lib/idb";
import {
  Camera,
  Zap,
  RefreshCcw,
  ImageIcon,
  X,
  Check,
  XCircle,
  Download,
  CheckSquare,
  Loader2,
  CloudOff,
  Cloud,
  Square,
} from "lucide-react";

interface DisposableCameraProps {
  eventId: string;
  isOnline?: boolean;
  pendingCount?: number;
}

export function DisposableCamera({
  eventId,
  isOnline = true,
  pendingCount = 0,
}: DisposableCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photosTaken, setPhotosTaken] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState(false); // For screen overlay
  const [flashEnabled, setFlashEnabled] = useState(false); // For torch and logic
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );
  const [activePreset, setActivePreset] = useState<Preset>(defaultPreset);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<PhotoRecord[]>([]);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedForDownload, setSelectedForDownload] = useState<Set<string>>(
    new Set(),
  );
  const [useFrame, setUseFrame] = useState(false);
  const [guestMessage, setGuestMessage] = useState("");
  const [latestPhotoBlob, setLatestPhotoBlob] = useState<Blob | null>(null);

  const isBW = activePreset.id === "ilford-hp5";

  const latestPhotoUrl = useMemo(() => {
    if (!latestPhotoBlob) return null;
    return URL.createObjectURL(latestPhotoBlob);
  }, [latestPhotoBlob]);

  const downloadSinglePhoto = (url: string) => {
    const guestName = localStorage.getItem("snapmoment_guest_name") || "tamu";
    const safeName = guestName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

    const a = document.createElement("a");
    a.href = url;
    a.download = `snapmoment-${safeName}-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadSelectedPhotos = async () => {
    const photosToDownload =
      isSelectionMode && selectedForDownload.size > 0
        ? galleryPhotos.filter((p) =>
            selectedForDownload.has(p.client_photo_id),
          )
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
        zip.file(
          `snapmoment-${safeName}-${index + 1}-${photo.taken_at}.jpg`,
          photo.blob,
        );
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
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
    setSelectedForDownload((prev) => {
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
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem("snapmoment_guest_id", id);
    }
    setGuestId(id);

    // Load initial stats and latest photo
    getAllPhotos()
      .then((photos) => {
        setPhotosTaken(photos.length);
        if (photos.length > 0) {
          photos.sort((a, b) => b.taken_at - a.taken_at);
          setLatestPhotoBlob(photos[0].blob);
        }
      })
      .catch(console.warn);
  }, []);

  const startCamera = async () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      let newStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: facingMode } },
          audio: false,
        });
      } catch (err) {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
      }

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      } catch (fallbackErr) {
        console.error("Fallback error:", fallbackErr);
        alert("Gagal mengakses kamera. Pastikan izin diberikan.");
      }
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

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;

    setIsCapturing(true);
    let torchTrack: MediaStreamTrack | null = null;

    if (flashEnabled) {
      if (facingMode === "user") {
        setFlash(true);
        // Wait 400ms for screen brightness to illuminate face and camera exposure to adjust
        await new Promise((r) => setTimeout(r, 400));
      } else {
        if (stream) {
          torchTrack = stream.getVideoTracks()[0];
          if (torchTrack) {
            try {
              const capabilities = (torchTrack.getCapabilities &&
                torchTrack.getCapabilities()) as any;
              if (capabilities?.torch) {
                await torchTrack.applyConstraints({
                  advanced: [{ torch: true } as any],
                });
                await new Promise((r) => setTimeout(r, 250));
              }
            } catch (e) {
              console.warn("Torch capture not supported", e);
            }
          }
        }
        setFlash(true);
      }
    }

    // Haptic & Sound (Shutter)
    if (typeof navigator !== "undefined" && navigator.vibrate)
      navigator.vibrate(40);
    try {
      const clickSound = new Audio("/sounds/shutter.mp3");
      clickSound.volume = 0.5;
      clickSound.play().catch((e) => console.warn("Audio play blocked", e));
    } catch (e) {}

    // Screen flash effect if flash is enabled
    if (flashEnabled) {
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate new dimensions (max 2000px longest side)
    const maxDim = 2000;
    let videoWidth = video.videoWidth;
    let videoHeight = video.videoHeight;

    if (videoWidth > maxDim || videoHeight > maxDim) {
      if (videoWidth > videoHeight) {
        videoHeight = Math.floor(videoHeight * (maxDim / videoWidth));
        videoWidth = maxDim;
      } else {
        videoWidth = Math.floor(videoWidth * (maxDim / videoHeight));
        videoHeight = maxDim;
      }
    }

    let canvasWidth = videoWidth;
    let canvasHeight = videoHeight;
    let imgX = 0;
    let imgY = 0;
    let frameBottom = 0;

    if (useFrame) {
      const padding = Math.floor(videoWidth * 0.05);
      frameBottom = Math.floor(videoWidth * 0.25);
      canvasWidth = videoWidth + padding * 2;
      canvasHeight = videoHeight + padding + frameBottom;
      imgX = padding;
      imgY = padding;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // 1. Draw Frame Background
    if (useFrame) {
      ctx.fillStyle = "#F8F8F8";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // 2. Draw Video
    ctx.filter = activePreset.cssFilter;
    ctx.save();
    if (facingMode === "user") {
      ctx.translate(canvasWidth, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, imgX, imgY, videoWidth, videoHeight);
    ctx.restore();

    ctx.filter = "none";

    // Save state for overlays restricted to the photo area
    ctx.save();
    ctx.beginPath();
    ctx.rect(imgX, imgY, videoWidth, videoHeight);
    ctx.clip();

    // 1. Light Leak (Randomized)
    if (activePreset.hasLightLeak && Math.random() > 0.6) {
      const leakGradient = ctx.createLinearGradient(
        imgX,
        imgY,
        imgX + videoWidth * 0.4,
        imgY + videoHeight * 0.5,
      );
      leakGradient.addColorStop(0, "rgba(255, 60, 0, 0.4)"); // bright orange/red
      leakGradient.addColorStop(1, "rgba(255, 0, 0, 0)");
      ctx.fillStyle = leakGradient;
      ctx.globalCompositeOperation = "screen";
      ctx.fillRect(imgX, imgY, videoWidth, videoHeight);
      ctx.globalCompositeOperation = "source-over";
    }

    // 2. Vignette
    if (activePreset.hasVignette) {
      const gradient = ctx.createRadialGradient(
        imgX + videoWidth / 2,
        imgY + videoHeight / 2,
        Math.min(videoWidth, videoHeight) * 0.4,
        imgX + videoWidth / 2,
        imgY + videoHeight / 2,
        Math.max(videoWidth, videoHeight) * 0.75,
      );
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx.fillStyle = gradient;
      ctx.globalCompositeOperation = "multiply";
      ctx.fillRect(imgX, imgY, videoWidth, videoHeight);
      ctx.globalCompositeOperation = "source-over";
    }

    // Algorithmic Grain/Noise Generator
    if (activePreset.grainIntensity && activePreset.grainIntensity > 0) {
      // Create a small offscreen canvas for noise pattern
      const noiseCanvas = document.createElement("canvas");
      noiseCanvas.width = 256;
      noiseCanvas.height = 256;
      const nCtx = noiseCanvas.getContext("2d");
      if (nCtx) {
        const idata = nCtx.createImageData(256, 256);
        const buffer32 = new Uint32Array(idata.data.buffer);
        const len = buffer32.length;

        for (let i = 0; i < len; i++) {
          if (Math.random() < 0.5) {
            buffer32[i] = 0xff000000; // Black pixel
          } else {
            buffer32[i] = 0x00000000; // Transparent pixel
          }
        }
        nCtx.putImageData(idata, 0, 0);

        // Draw noise over the main canvas
        const pattern = ctx.createPattern(noiseCanvas, "repeat");
        if (pattern) {
          ctx.globalAlpha = activePreset.grainIntensity;
          ctx.fillStyle = pattern;
          ctx.globalCompositeOperation = "overlay";
          ctx.fillRect(imgX, imgY, videoWidth, videoHeight);

          // Reset context states
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1.0;
        }
      }
    }

    ctx.restore(); // Remove clipping mask

    // 4. Date-Cam Timestamp
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const timeStr = `'${yy} ${mm} ${dd}`;

    let textX, textY;
    if (useFrame) {
      ctx.textAlign = "center";
      ctx.fillStyle = "#222";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.font = `bold ${Math.floor(videoWidth * 0.045)}px sans-serif`;
      textX = canvasWidth / 2;
      textY = imgY + videoHeight + frameBottom * 0.55;
    } else {
      ctx.font = `bold ${Math.floor(videoWidth * 0.035)}px monospace`;
      ctx.fillStyle = "#FF5500";
      ctx.shadowColor = "rgba(255,0,0,0.8)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.textAlign = "right";
      textX = imgX + videoWidth - videoWidth * 0.05;
      textY = imgY + videoHeight - videoHeight * 0.05;
    }

    ctx.globalCompositeOperation = useFrame ? "source-over" : "screen";
    ctx.fillText(timeStr, textX, textY);
    if (!useFrame) ctx.fillText(timeStr, textX, textY);
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.filter = "none";
    if (flashEnabled) {
      setFlash(false);
    }

    if (torchTrack) {
      torchTrack
        .applyConstraints({ advanced: [{ torch: false } as any] })
        .catch(console.warn);
    }

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setPreviewBlob(blob);
        } else {
          alert("Gagal memproses foto.");
        }
        setIsCapturing(false);
      },
      "image/webp",
      0.78,
    );
  };

  const confirmPhoto = async () => {
    if (!previewBlob) return;

    let finalBlob = previewBlob;

    if (useFrame && guestMessage) {
      // Bake the text into the image
      const img = new window.Image();
      img.src = URL.createObjectURL(previewBlob);
      await new Promise((resolve) => (img.onload = resolve));

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const ctx = tempCanvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(img, 0, 0);

        ctx.textAlign = "center";
        ctx.fillStyle = "#222";
        ctx.font = `bold ${Math.floor(img.width * 0.045)}px "Comic Sans MS", cursive, sans-serif`;

        // frameBottom is approx img.width * 0.22
        const textY = img.height - Math.floor(img.width * 0.16);
        ctx.fillText(guestMessage, img.width / 2, textY);

        finalBlob =
          (await new Promise<Blob>((resolve) => {
            tempCanvas.toBlob((b) => resolve(b as Blob), "image/webp", 0.9);
          })) || previewBlob;
      }
    }

    // Haptic & Sound (Winding)
    if (typeof navigator !== "undefined" && navigator.vibrate)
      navigator.vibrate([30, 50, 30, 50, 30, 50]);
    try {
      const windSound = new Audio("/sounds/wind.mp3");
      windSound.volume = 0.5;
      windSound.play().catch((e) => console.warn("Audio play blocked", e));
    } catch (e) {}

    try {
      const client_photo_id = crypto.randomUUID();
      await savePhotoLocally({
        client_photo_id,
        event_id: eventId,
        guest_id: guestId,
        blob: finalBlob,
        status: "pending",
        taken_at: Date.now(),
      });
      setPhotosTaken((prev) => prev + 1);
      setLatestPhotoBlob(finalBlob);
    } catch (error) {
      console.error("Error saving photo locally:", error);
      alert("Gagal menyimpan foto. Memori mungkin penuh.");
    } finally {
      setPreviewBlob(null);
      setGuestMessage("");
    }
  };

  const retakePhoto = () => {
    setPreviewBlob(null);
    setGuestMessage("");
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
    <div className="fixed inset-0 w-full h-full bg-neutral-900 touch-none flex flex-col overflow-hidden font-sans select-none">
      {/* CSS Texture for leather body */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none mix-blend-overlay z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Side Color Bands based on preset */}
      <div className="absolute top-[20%] bottom-[25%] left-0 w-12 sm:w-16 bg-white z-0 flex flex-col justify-around py-10 shadow-[inset_-5px_0_15px_rgba(0,0,0,0.3)]">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="w-full h-2 sm:h-3"
            style={{ backgroundColor: activePreset.cameraBodyColor }}
          />
        ))}
      </div>
      <div className="absolute top-[20%] bottom-[25%] right-0 w-12 sm:w-16 bg-white z-0 flex flex-col justify-around py-10 shadow-[inset_5px_0_15px_rgba(0,0,0,0.3)]">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="w-full h-2 sm:h-3"
            style={{ backgroundColor: activePreset.cameraBodyColor }}
          />
        ))}
      </div>

      {/* Top Bar */}
      <div className="relative z-10 w-full flex justify-between items-center p-4 sm:p-6 pt-12 sm:pt-16 text-neutral-400 font-bold text-xs uppercase tracking-widest">
        {/* Online/Offline Status */}
        <div className="flex items-center gap-2 bg-neutral-800/80 px-3 py-1.5 rounded-full shadow-inner border border-neutral-700">
          <div
            className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500 shadow-[0_0_5px_#22c55e]" : "bg-red-500 shadow-[0_0_5px_#ef4444]"}`}
          ></div>
          <span className="text-white/70 tracking-widest">
            {isOnline ? "ONLINE" : "OFFLINE"}
          </span>
        </div>

        {/* Upload Status Badge */}
        <div className="flex items-center">
          {pendingCount > 0 ? (
            <div className="bg-black/80 backdrop-blur border border-white/10 rounded-full px-3 py-1.5 flex items-center space-x-2 shadow-lg">
              {isOnline ? (
                <Loader2 size={12} className="animate-spin text-white" />
              ) : (
                <CloudOff size={12} className="text-red-400" />
              )}
              <span className="text-xs font-medium text-white normal-case tracking-normal">
                {pendingCount} tertunda
              </span>
            </div>
          ) : (
            <div className="bg-black/40 backdrop-blur border border-white/10 rounded-full px-3 py-1.5 flex items-center space-x-2">
              <Cloud size={12} className="text-green-400" />
              <span className="text-xs font-medium text-white/50 normal-case tracking-normal">
                Semua tersimpan
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Viewfinder Center */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-16 sm:px-24">
        <div className="w-full aspect-[3/4] max-w-[320px] bg-black rounded-[32px] p-1.5 shadow-[0_15px_35px_rgba(0,0,0,0.8),inset_0_2px_5px_rgba(255,255,255,0.1),inset_0_-2px_5px_rgba(0,0,0,0.5)] border-4 border-neutral-800 relative">
          <div className="w-full h-full relative">
            {/* Live Camera Feed & Frame */}
            <div
              className={`absolute inset-0 overflow-hidden shadow-[inset_0_8px_20px_rgba(0,0,0,1)] border-2 border-black transition-all duration-300 ${useFrame ? "bg-[#F8F8F8] p-[6%] pb-[25%] rounded-[8px]" : "bg-neutral-900 rounded-[24px] p-0"}`}
            >
              <div
                className={`relative w-full h-full overflow-hidden ${useFrame ? "shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]" : "rounded-[24px]"}`}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                  style={{
                    filter: activePreset.cssFilter,
                    transition: "filter 0.5s",
                  }}
                />

                {/* Viewfinder Glass Reflection */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 pointer-events-none" />

                {/* Flash overlay (Back camera visual effect) */}
                {flash && facingMode === "environment" && (
                  <div className="absolute inset-0 bg-white z-50 pointer-events-none opacity-90" />
                )}
              </div>

              {/* Live Timestamp (only visible in viewfinder if useFrame is true) */}
              {useFrame && (
                <div
                  className="absolute bottom-[6%] left-0 w-full text-center text-[#444] font-bold pointer-events-none"
                  style={{
                    fontFamily: '"Comic Sans MS", cursive, sans-serif',
                    fontSize: "clamp(14px, 4vw, 20px)",
                  }}
                >
                  '{String(new Date().getFullYear()).slice(-2)}{" "}
                  {String(new Date().getMonth() + 1).padStart(2, "0")}{" "}
                  {String(new Date().getDate()).padStart(2, "0")}
                </div>
              )}
            </div>

            {/* Preview Overlay */}
            {previewBlob && (
              <div className="absolute inset-0 z-20 bg-neutral-950 flex flex-col rounded-[24px] overflow-hidden">
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={URL.createObjectURL(previewBlob)}
                    className={`absolute inset-0 w-full h-full ${useFrame ? "object-contain p-2" : "object-cover"}`}
                    alt="Preview"
                  />

                  {useFrame && (
                    <div className="absolute bottom-[26%] w-full px-8 flex justify-center z-30">
                      <input
                        type="text"
                        maxLength={30}
                        value={guestMessage}
                        onChange={(e) => setGuestMessage(e.target.value)}
                        placeholder="Tulis pesan (opsional)..."
                        className="w-full bg-transparent border-none text-[#333] placeholder-[#888] text-center outline-none py-1 drop-shadow-sm font-bold"
                        style={{
                          fontFamily: '"Comic Sans MS", cursive, sans-serif',
                          fontSize: "clamp(12px, 3vw, 16px)",
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end z-40 pointer-events-none">
                  <button
                    onClick={retakePhoto}
                    className="pointer-events-auto flex flex-col items-center justify-center p-2 text-white/80 hover:text-white drop-shadow-md"
                  >
                    <XCircle size={32} className="text-red-400 mb-1" />
                  </button>
                  <button
                    onClick={confirmPhoto}
                    className="pointer-events-auto flex flex-col items-center justify-center p-2 text-white/80 hover:text-white drop-shadow-md"
                  >
                    <Check size={40} className="text-green-400 mb-1" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Front Camera Full-Screen Flash Overlay */}
      {flash && facingMode === "user" && (
        <div className="fixed inset-0 bg-white z-[200] pointer-events-none" />
      )}

      {/* Dial & Shutter Area */}
      <div className="relative z-10 w-full pb-4 sm:pb-8 flex flex-col items-center">
        {/* Dial Indicator */}
        <div className="w-32 h-8 relative overflow-hidden mb-2 opacity-60">
          <div className="absolute w-[200%] h-[200%] border-t-2 border-dashed border-white/50 rounded-full left-1/2 -translate-x-1/2 top-4"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white flex gap-4">
            <span>0.5x</span>
            <span className="text-yellow-500 font-black">1x</span>
            <span>2x</span>
          </div>
        </div>

        {/* Shutter row */}
        <div className="flex w-full px-8 sm:px-12 items-center justify-between">
          {/* Left button: Camera Swap, Frame Toggle, Counter */}
          <div className="w-20 flex justify-start">
            <div className="flex flex-col items-center gap-2">
              <div className="bg-neutral-800 text-neutral-400 text-[10px] font-bold px-3 py-1 rounded-full shadow-inner border border-neutral-700">
                {String(photosTaken).padStart(2, "0")}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={toggleCamera}
                  className={`w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center border border-neutral-700 shadow-inner ${isBW ? "text-neutral-300" : "text-orange-500"}`}
                >
                  <RefreshCcw size={16} />
                </button>
                <button
                  onClick={() => setUseFrame(!useFrame)}
                  className={`w-10 h-10 ${useFrame ? "bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "bg-neutral-800 text-neutral-400 border-neutral-700"} rounded-xl flex items-center justify-center border shadow-inner transition-all`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="2" width="18" height="20" rx="2" ry="2" />
                    <line x1="3" y1="17" x2="21" y2="17" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Center Shutter */}
          <button
            onClick={capturePhoto}
            disabled={isCapturing || !!previewBlob}
            className={`w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-full ${isBW ? "bg-neutral-300" : "bg-orange-500"} shadow-[0_5px_15px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-4px_8px_rgba(0,0,0,0.3)] border-4 border-neutral-800 active:scale-95 transition-transform flex items-center justify-center relative disabled:opacity-50`}
          />

          {/* Right button: Flash */}
          <div className="w-20 flex justify-end">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFlashEnabled(!flashEnabled)}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 transition-colors ${flashEnabled ? "bg-white border-white text-yellow-500 shadow-[0_0_15px_rgba(255,255,255,0.5)]" : "bg-neutral-300 border-neutral-400 text-neutral-500"}`}
              >
                <Zap size={20} fill={flashEnabled ? "currentColor" : "none"} />
              </button>
              {/* LED indicator */}
              <div
                className={`w-2 h-2 rounded-full shadow-sm transition-colors ${flashEnabled ? "bg-yellow-400 shadow-[0_0_8px_#FBBF24]" : "bg-neutral-700"}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="relative z-10 w-full px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto w-full pb-2 snap-x hide-scrollbar">
          {Object.values(presets).map((preset) => (
            <button
              key={preset.id}
              onClick={() => setActivePreset(preset)}
              className={`shrink-0 snap-center px-4 py-2 rounded-full text-[10px] uppercase tracking-wider font-bold transition-all border-2 ${
                activePreset.id === preset.id
                  ? "bg-neutral-800 text-white border-neutral-600 shadow-lg"
                  : "bg-transparent text-neutral-500 border-transparent hover:text-neutral-300"
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Footer Area */}
      <div className="relative z-10 w-full p-4 flex justify-between items-center border-t border-neutral-800 bg-neutral-950/90 backdrop-blur-md">
        <button
          onClick={openGallery}
          className={`w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center shadow-inner overflow-hidden border border-neutral-700 transition-transform active:scale-95 ${isBW ? "text-neutral-300" : "text-orange-500"}`}
        >
          {latestPhotoUrl ? (
            <img
              src={latestPhotoUrl}
              className="w-full h-full object-cover"
              alt="Gallery"
            />
          ) : (
            <ImageIcon size={20} />
          )}
        </button>

        <div className="flex items-center gap-2 bg-neutral-800/80 pl-1 pr-4 py-1 rounded-full shadow-inner border border-neutral-800">
          <div
            className={`w-8 h-8 rounded-full ${isBW ? "bg-neutral-500" : "bg-orange-500"} flex items-center justify-center text-white text-xs font-bold relative`}
          >
            S
            <div className="absolute top-0 left-0 w-2 h-2 bg-yellow-400 rounded-full border border-black shadow-sm" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-white/50 text-[9px] font-bold">
              SnapMoment
            </span>
            <span className="text-white text-[11px] font-bold">
              Best Party! Ever
            </span>
          </div>
        </div>

        <div
          className={`w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center shadow-inner ${isBW ? "text-neutral-300" : "text-orange-500"}`}
        >
          <Camera size={20} />
        </div>
      </div>

      {/* Hidden Canvas */}
      <canvas ref={canvasRef} className="hidden" />
      {/* Fullscreen Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-4 flex justify-between items-center bg-neutral-900 border-b border-neutral-800 shrink-0">
            <h2 className="text-xl font-bold text-white">
              {isSelectionMode
                ? `${selectedForDownload.size} Dipilih`
                : "Galeri Anda"}
            </h2>
            <div className="flex items-center gap-2">
              {galleryPhotos.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      if (isSelectionMode) setSelectedForDownload(new Set());
                    }}
                    className={`p-2 rounded-full text-white transition-colors ${isSelectionMode ? "bg-blue-600 hover:bg-blue-700" : "bg-neutral-800 hover:bg-neutral-700"}`}
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
              <button
                onClick={() => {
                  setShowGallery(false);
                  setIsSelectionMode(false);
                  setSelectedForDownload(new Set());
                }}
                className="p-2 bg-neutral-800 rounded-full text-white hover:bg-neutral-700 transition-colors"
              >
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
                      className={`cursor-pointer aspect-square bg-neutral-800 rounded-lg overflow-hidden relative shadow-md transition-all ${isSelected ? "ring-2 ring-blue-500 scale-95 opacity-80" : ""}`}
                    >
                      <img
                        src={url}
                        className="w-full h-full object-cover"
                        alt="Saved photo"
                      />
                      {isSelectionMode && isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                          <div className="bg-blue-500 rounded-full p-1 text-white">
                            <Check size={20} />
                          </div>
                        </div>
                      )}
                      {p.status === "pending" && (
                        <div className="absolute top-1 right-1 bg-yellow-500 w-2 h-2 rounded-full shadow-sm" />
                      )}
                      {p.status === "uploading" && (
                        <div className="absolute top-1 right-1 bg-blue-500 w-2 h-2 rounded-full animate-pulse shadow-sm" />
                      )}
                      {p.status === "uploaded" && (
                        <div className="absolute top-1 right-1 bg-green-500 w-2 h-2 rounded-full shadow-sm" />
                      )}
                      {p.status === "failed" && (
                        <div className="absolute top-1 right-1 bg-red-500 w-2 h-2 rounded-full shadow-sm" />
                      )}
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
                <button
                  onClick={() => downloadSinglePhoto(selectedPhotoUrl)}
                  className="p-2 bg-neutral-800/80 rounded-full text-white backdrop-blur-md hover:bg-neutral-700/80 transition-colors"
                >
                  <Download size={20} />
                </button>
                <button
                  onClick={() => setSelectedPhotoUrl(null)}
                  className="p-2 bg-neutral-800/80 rounded-full text-white backdrop-blur-md hover:bg-neutral-700/80 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <img
                  src={selectedPhotoUrl}
                  className="w-full h-full object-contain"
                  alt="Full preview"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
