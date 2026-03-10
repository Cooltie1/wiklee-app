"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Pencil } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSignedAvatarUrl, invalidateAvatarUrlCache } from "@/lib/avatarUrlCache";
import { supabase } from "@/lib/supabaseClient";

type AvatarUploaderProps = {
  userId: string;
  name?: string | null;
  avatarPath?: string | null;
  sizeClassName?: string;
  tooltipText?: string;
  onAvatarUpdated?: (nextAvatarPath: string) => void;
};

export const AVATAR_UPDATED_EVENT = "profile-avatar-updated";

const CROP_SIZE = 280;
const OUTPUT_SIZE = 512;

type AvatarUpdatedEventDetail = {
  userId: string;
  avatarPath: string;
};

type CropImageMetrics = {
  width: number;
  height: number;
};

type CropOffset = {
  x: number;
  y: number;
};

function getFileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName) {
    return fromName;
  }

  const mimeExtension = file.type.split("/")[1]?.toLowerCase();
  return mimeExtension || "png";
}

function getInitials(name?: string | null) {
  const normalized = name?.trim();

  if (!normalized) {
    return "?";
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");

  return initials.join("") || "?";
}

export function AvatarUploader({
  userId,
  name,
  avatarPath,
  sizeClassName = "h-24 w-24",
  tooltipText = "Upload profile picture",
  onAvatarUpdated,
}: AvatarUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropOffset, setCropOffset] = useState<CropOffset>({ x: 0, y: 0 });
  const [cropImageMetrics, setCropImageMetrics] = useState<CropImageMetrics | null>(null);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startOffset: CropOffset } | null>(null);
  const cropImageElementRef = useRef<HTMLImageElement | null>(null);

  const fallback = useMemo(() => getInitials(name), [name]);
  const displaySrc = localPreviewUrl ?? signedUrl;

  useEffect(() => {
    let isMounted = true;

    if (!avatarPath?.trim()) {
      return () => {
        isMounted = false;
      };
    }

    (async () => {
      try {
        const url = await getSignedAvatarUrl(supabase, avatarPath, 3600, true);
        if (isMounted) {
          setSignedUrl(url);
        }
      } catch (loadError) {
        console.error("Failed to load avatar signed URL", loadError);
        if (isMounted) {
          setSignedUrl(null);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [avatarPath]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }

      if (cropSourceUrl) {
        URL.revokeObjectURL(cropSourceUrl);
      }
    };
  }, [cropSourceUrl, localPreviewUrl]);

  const baseScale = useMemo(() => {
    if (!cropImageMetrics) {
      return 1;
    }

    return Math.max(CROP_SIZE / cropImageMetrics.width, CROP_SIZE / cropImageMetrics.height);
  }, [cropImageMetrics]);

  const effectiveScale = baseScale * cropScale;

  const maxOffsets = useMemo(() => {
    if (!cropImageMetrics) {
      return { x: 0, y: 0 };
    }

    return {
      x: Math.max((cropImageMetrics.width * effectiveScale - CROP_SIZE) / 2, 0),
      y: Math.max((cropImageMetrics.height * effectiveScale - CROP_SIZE) / 2, 0),
    };
  }, [cropImageMetrics, effectiveScale]);

  function getMaxOffsetsForScale(scaleValue: number) {
    if (!cropImageMetrics) {
      return { x: 0, y: 0 };
    }

    const nextEffectiveScale = baseScale * scaleValue;
    return {
      x: Math.max((cropImageMetrics.width * nextEffectiveScale - CROP_SIZE) / 2, 0),
      y: Math.max((cropImageMetrics.height * nextEffectiveScale - CROP_SIZE) / 2, 0),
    };
  }

  function clampOffset(offset: CropOffset) {
    return {
      x: Math.max(-maxOffsets.x, Math.min(maxOffsets.x, offset.x)),
      y: Math.max(-maxOffsets.y, Math.min(maxOffsets.y, offset.y)),
    };
  }


  function resetCropState() {
    setCropScale(1);
    setCropOffset({ x: 0, y: 0 });
    setCropImageMetrics(null);
    setIsDraggingCrop(false);
    dragStartRef.current = null;
    cropImageElementRef.current = null;
  }

  function closeCropDialog() {
    setCropDialogOpen(false);
    setPendingFile(null);
    resetCropState();

    if (cropSourceUrl) {
      URL.revokeObjectURL(cropSourceUrl);
      setCropSourceUrl(null);
    }
  }

  async function getCroppedFile() {
    if (!cropImageElementRef.current || !cropImageMetrics) {
      return null;
    }

    const imageElement = cropImageElementRef.current;
    const sourceX = (0 - CROP_SIZE / 2 - cropOffset.x) / effectiveScale + cropImageMetrics.width / 2;
    const sourceY = (0 - CROP_SIZE / 2 - cropOffset.y) / effectiveScale + cropImageMetrics.height / 2;
    const sourceSize = CROP_SIZE / effectiveScale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    context.drawImage(
      imageElement,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png", 0.95);
    });

    if (!blob) {
      return null;
    }

    return new File([blob], "avatar.png", { type: "image/png" });
  }

  async function onConfirmCrop() {
    const croppedFile = await getCroppedFile();
    if (!croppedFile) {
      setError("Unable to crop this image. Please try another image.");
      return;
    }

    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }

    const nextPreviewUrl = URL.createObjectURL(croppedFile);
    setLocalPreviewUrl(nextPreviewUrl);
    closeCropDialog();
    void uploadAvatar(croppedFile);
  }

  async function uploadAvatar(file: File) {
    setError(null);
    setIsUploading(true);

    const extension = getFileExtension(file);
    const nextAvatarPath = `users/${userId}/avatar.${extension}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(nextAvatarPath, file, {
      upsert: true,
      contentType: file.type,
    });

    if (uploadError) {
      setError(uploadError.message);
      setIsUploading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_path: nextAvatarPath })
      .eq("id", userId);

    if (profileError) {
      setError(profileError.message);
      setIsUploading(false);
      return;
    }

    invalidateAvatarUrlCache(avatarPath);
    invalidateAvatarUrlCache(nextAvatarPath);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<AvatarUpdatedEventDetail>(AVATAR_UPDATED_EVENT, {
          detail: {
            userId,
            avatarPath: nextAvatarPath,
          },
        }),
      );
    }

    onAvatarUpdated?.(nextAvatarPath);
    setIsUploading(false);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];

    if (!selected) {
      return;
    }

    if (!selected.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setError(null);
    setPendingFile(selected);
    resetCropState();

    if (cropSourceUrl) {
      URL.revokeObjectURL(cropSourceUrl);
    }

    const nextSourceUrl = URL.createObjectURL(selected);
    setCropSourceUrl(nextSourceUrl);
    setCropDialogOpen(true);
    event.target.value = "";
  }

  return (
    <div className="space-y-2">
      <div className="group relative inline-flex">
        <button
          type="button"
          className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title={tooltipText}
          aria-label={tooltipText}
        >
          <Avatar className={sizeClassName}>
            {displaySrc ? <AvatarImage src={displaySrc} alt={`${name ?? "User"} avatar`} /> : null}
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <Pencil className="h-5 w-5" />
          </span>
          {isUploading ? (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-xs font-medium text-white">
              Uploading...
            </span>
          ) : null}
        </button>

        <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {tooltipText}
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onFileChange}
        disabled={isUploading}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Dialog
        open={cropDialogOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeCropDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Crop avatar</DialogTitle>
            <DialogDescription>Drag and zoom your image. The outlined circle previews your final avatar.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div
              className="relative mx-auto h-[280px] w-[280px] touch-none overflow-hidden rounded-md bg-muted"
              onPointerDown={(event) => {
                if (!cropImageMetrics) {
                  return;
                }

                event.currentTarget.setPointerCapture(event.pointerId);
                setIsDraggingCrop(true);
                dragStartRef.current = {
                  x: event.clientX,
                  y: event.clientY,
                  startOffset: cropOffset,
                };
              }}
              onPointerMove={(event) => {
                if (!isDraggingCrop || !dragStartRef.current) {
                  return;
                }

                const deltaX = event.clientX - dragStartRef.current.x;
                const deltaY = event.clientY - dragStartRef.current.y;
                setCropOffset(clampOffset({ x: dragStartRef.current.startOffset.x + deltaX, y: dragStartRef.current.startOffset.y + deltaY }));
              }}
              onPointerUp={(event) => {
                event.currentTarget.releasePointerCapture(event.pointerId);
                setIsDraggingCrop(false);
                dragStartRef.current = null;
              }}
              onPointerCancel={() => {
                setIsDraggingCrop(false);
                dragStartRef.current = null;
              }}
            >
              {cropSourceUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  ref={cropImageElementRef}
                  src={cropSourceUrl}
                  alt="Avatar crop preview"
                  className="absolute left-1/2 top-1/2 max-w-none select-none"
                  draggable={false}
                  style={{
                    transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px)) scale(${effectiveScale})`,
                    transformOrigin: "center",
                  }}
                  onLoad={(event) => {
                    const imageElement = event.currentTarget;
                    setCropImageMetrics({
                      width: imageElement.naturalWidth,
                      height: imageElement.naturalHeight,
                    });
                    setCropOffset({ x: 0, y: 0 });
                  }}
                />
              ) : null}

              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: "radial-gradient(circle at center, transparent 67%, rgba(0, 0, 0, 0.45) 68%)" }}
              />
            </div>

            <label className="block space-y-2 text-sm">
              <span className="text-muted-foreground">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={cropScale}
                onChange={(event) => {
                  const nextScale = Number(event.target.value);
                  const nextMaxOffsets = getMaxOffsetsForScale(nextScale);
                  setCropScale(nextScale);
                  setCropOffset((current) => ({
                    x: Math.max(-nextMaxOffsets.x, Math.min(nextMaxOffsets.x, current.x)),
                    y: Math.max(-nextMaxOffsets.y, Math.min(nextMaxOffsets.y, current.y)),
                  }));
                }}
                className="w-full"
              />
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeCropDialog}>
              Cancel
            </Button>
            <Button type="button" onClick={onConfirmCrop} disabled={!pendingFile || isUploading}>
              Save Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
