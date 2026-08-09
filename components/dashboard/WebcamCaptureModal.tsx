"use client";

import { useState, useEffect, useRef } from "react";
import { Camera, RefreshCw, X, Check, Image as ImageIcon } from "lucide-react";

export function WebcamCaptureModal({
  title = "Capture Live Photo",
  aspectRatio = "headshot", // "headshot" | "idcard"
  isOpen,
  onClose,
  onCapture,
}: {
  title?: string;
  aspectRatio?: "headshot" | "idcard";
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize camera stream when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      return;
    }

    startCamera(facingMode);

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async (mode: "user" | "environment") => {
    setIsInitializing(true);
    setCameraError(null);
    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setIsInitializing(false);
    } catch (err: any) {
      console.warn("Webcam access error:", err);
      setIsInitializing(false);
      setCameraError("Camera access denied or unavailable on this device. Please allow camera permissions or upload a file instead.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Flip horizontally if front camera for natural mirror effect
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
  };

  const handleConfirmPhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      stopCamera();
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={() => {
        stopCamera();
        onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 text-xs relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#c2652a]" />
            <h3 className="font-serif font-bold text-lg text-gray-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Container */}
        <div className="relative bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-gray-800 shadow-inner">
          {cameraError ? (
            <div className="p-6 text-center text-white space-y-2 max-w-xs">
              <Camera className="w-10 h-10 text-amber-500 mx-auto opacity-80" />
              <p className="font-bold text-xs">{cameraError}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="mt-2 px-4 py-2 rounded-xl bg-[#c2652a] text-white font-bold text-xs"
              >
                Try Again
              </button>
            </div>
          ) : capturedImage ? (
            /* Freeze-frame Captured Image */
            <img
              src={capturedImage}
              alt="Snapshot preview"
              className="w-full h-full object-cover"
            />
          ) : (
            /* Live Camera Video Feed */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === "user" ? "scale-x-[-1]" : ""
                }`}
              />
              {/* Overlay Alignment Guide */}
              <div className="absolute inset-0 border-2 border-white/30 pointer-events-none flex items-center justify-center">
                {aspectRatio === "headshot" ? (
                  <div className="w-36 h-48 rounded-full border-2 border-dashed border-amber-400/80 bg-black/20 flex items-center justify-center">
                    <span className="text-[10px] text-amber-300 font-bold bg-black/60 px-2 py-0.5 rounded-full">
                      Align Face Here
                    </span>
                  </div>
                ) : (
                  <div className="w-64 h-40 rounded-xl border-2 border-dashed border-amber-400/80 bg-black/20 flex items-center justify-center">
                    <span className="text-[10px] text-amber-300 font-bold bg-black/60 px-2 py-0.5 rounded-full">
                      Align ID Card Here
                    </span>
                  </div>
                )}
              </div>

              {/* Flip Camera Button */}
              <button
                type="button"
                onClick={toggleFacingMode}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer border border-white/20"
                title="Flip Camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}

          {isInitializing && !capturedImage && !cameraError && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-white text-xs font-bold gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#c2652a]" /> Starting Camera...
            </div>
          )}
        </div>

        {/* Action Controls Footer */}
        <div className="pt-2 flex items-center gap-3">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Retake Photo
              </button>
              <button
                type="button"
                onClick={handleConfirmPhoto}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Confirm & Use Photo
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!cameraError || isInitializing}
                onClick={handleTakeSnapshot}
                className="flex-1 py-3 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Camera className="w-4 h-4" /> Snap Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
