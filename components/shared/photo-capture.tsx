"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, Upload, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  /** Fires with a base64 data URI whenever a photo is captured/selected, or null when cleared. */
  onChange: (dataUri: string | null) => void;
  label?: string;
  initialPhotoUrl?: string | null;
};

/**
 * Two ways to get a member photo:
 *   1. "Camera" — live getUserMedia preview + capture button (reception desk webcam/phone).
 *   2. "Upload" — pick an existing file from disk/gallery.
 * Either path resolves to a base64 data URI, which is what
 * lib/cloudinary.ts's uploadMemberPhoto() expects.
 */
export function PhotoCapture({ onChange, label = "Member photo", initialPhotoUrl }: Props) {
  const [mode, setMode] = useState<"idle" | "camera">("idle");
  const [preview, setPreview] = useState<string | null>(initialPhotoUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMode("idle");
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setMode("camera");
      // Video element isn't mounted until state updates; attach on next tick.
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setError("Couldn't access the camera. Check browser permissions, or upload a photo instead.");
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);

    const dataUri = canvas.toDataURL("image/jpeg", 0.9);
    setPreview(dataUri);
    onChange(dataUri);
    stopCamera();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      setPreview(dataUri);
      onChange(dataUri);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-zinc-700">{label}</p>

      {preview ? (
        <div className="flex items-center gap-4">
          <img
            src={preview}
            alt="Member preview"
            className="h-28 w-28 rounded-xl object-cover ring-1 ring-zinc-200"
          />
          <Button type="button" variant="outline" size="sm" onClick={clearPhoto}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Retake / replace
          </Button>
        </div>
      ) : mode === "camera" ? (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl bg-zinc-900">
            <video ref={videoRef} autoPlay playsInline className="aspect-[4/3] w-full max-w-xs object-cover" />
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={capturePhoto} size="sm">
              <Camera className="mr-1.5 h-3.5 w-3.5" />
              Capture
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={stopCamera}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={startCamera}>
            <Camera className="mr-1.5 h-3.5 w-3.5" />
            Use camera
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Upload photo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-600">
          <X className="h-3 w-3" /> {error}
        </p>
      )}
      <p className="text-xs text-zinc-400">Optional, but recommended for reception ID verification.</p>
    </div>
  );
}
