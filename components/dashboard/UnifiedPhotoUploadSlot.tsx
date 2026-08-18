"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Upload, Check, Trash2, RefreshCw, FileText, Monitor, Smartphone } from "lucide-react";
import { WebcamCaptureModal } from "./WebcamCaptureModal";

async function compressImageToJpeg(fileOrBase64: File | string, maxDim = 600, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(typeof fileOrBase64 === "string" ? fileOrBase64 : "");
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      resolve(typeof fileOrBase64 === "string" ? fileOrBase64 : "");
    };

    if (typeof fileOrBase64 === "string") {
      img.src = fileOrBase64;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(fileOrBase64);
    }
  });
}

export function UnifiedPhotoUploadSlot({
  label = "Profile Photo",
  aspectRatio = "headshot", // "headshot" | "idcard"
  value,
  onChange,
  onRemove,
  acceptedFormats = "image/*",
  placeholder = "JPG, PNG (Max 10MB raw - Auto-compressed to ~300KB)",
}: {
  label: string;
  aspectRatio?: "headshot" | "idcard";
  value?: string | null;
  onChange: (base64OrFileUrl: string) => void;
  onRemove?: () => void;
  acceptedFormats?: string;
  placeholder?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showChoiceDropdown, setShowChoiceDropdown] = useState(false);
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowChoiceDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle standard file input change (gallery or camera chooser) with auto-compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit. Please attach a smaller photo.");
      return;
    }

    try {
      const compressed = await compressImageToJpeg(
        file,
        aspectRatio === "headshot" ? 500 : 800,
        0.82
      );
      onChange(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        onChange(base64Url);
      };
      reader.readAsDataURL(file);
    }
    setShowChoiceDropdown(false);
  };

  const handleMainButtonClick = () => {
    // Reset file input value so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      fileInputRef.current?.click();
    } else {
      setShowChoiceDropdown((prev) => !prev);
    }
  };

  return (
    <div className="space-y-2 relative" ref={dropdownRef}>
      {/* Hidden File Input for Native File Chooser */}
      <input
        type="file"
        ref={fileInputRef}
        accept={acceptedFormats}
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        /* Preview Card State when photo is captured or uploaded */
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3 min-w-0">
            {value.startsWith("data:image") || value.startsWith("http") ? (
              <img
                src={value}
                alt={label}
                className={`object-cover rounded-xl border border-emerald-300 shadow-xs shrink-0 ${
                  aspectRatio === "headshot" ? "w-12 h-12 rounded-full" : "w-16 h-11 rounded-lg"
                }`}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-bold text-gray-900 text-xs truncate">{label}</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-extrabold block">
                ✓ Photo Ready & Attached
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleMainButtonClick}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold text-[10px] hover:bg-gray-50 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
              title="Change or Retake Photo"
            >
              <RefreshCw className="w-3 h-3 text-[#c2652a]" /> Change
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                title="Remove Photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty Slot Button */
        <button
          type="button"
          onClick={handleMainButtonClick}
          className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/70 hover:bg-orange-50/40 hover:border-[#c2652a] text-gray-700 font-bold text-xs transition-all flex items-center justify-center gap-2.5 group cursor-pointer shadow-2xs active:scale-98"
        >
          <div className="w-7 h-7 rounded-xl bg-orange-100 text-[#c2652a] flex items-center justify-center group-hover:scale-110 transition-transform">
            <Camera className="w-4 h-4" />
          </div>
          <span className="text-gray-900 font-bold">
            📸 Take Live Photo / Choose File
          </span>
        </button>
      )}

      {/* Choice Dropdown Popup (Available in both Empty and Change states) */}
      {showChoiceDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl p-2 space-y-1 animate-in zoom-in-95 text-xs">
          <div className="px-3 py-1.5 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Select Photo Method
          </div>

          <button
            type="button"
            onClick={() => {
              setShowChoiceDropdown(false);
              setShowWebcamModal(true);
            }}
            className="w-full p-2.5 rounded-xl hover:bg-orange-50 flex items-center gap-3 text-left transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#c2652a] font-bold flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-gray-900 block">📸 Take Snapshot with Webcam</span>
              <span className="text-[10px] text-gray-500">Uses laptop or PC camera stream</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowChoiceDropdown(false);
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
              fileInputRef.current?.click();
            }}
            className="w-full p-2.5 rounded-xl hover:bg-gray-100 flex items-center gap-3 text-left transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-gray-900 block">📁 Choose Photo File from Device</span>
              <span className="text-[10px] text-gray-500">Browse disk or photo gallery</span>
            </div>
          </button>
        </div>
      )}

      {/* Live Webcam Viewfinder Modal */}
      <WebcamCaptureModal
        title={`Take Live Photo for ${label}`}
        aspectRatio={aspectRatio}
        isOpen={showWebcamModal}
        onClose={() => setShowWebcamModal(false)}
        onCapture={async (imgData) => {
          const compressed = await compressImageToJpeg(imgData, aspectRatio === "headshot" ? 500 : 800, 0.82);
          onChange(compressed);
        }}
      />
    </div>
  );
}
