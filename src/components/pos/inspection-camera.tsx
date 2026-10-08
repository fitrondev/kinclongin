"use client";

import { useState } from "react";

import Image from "next/image";

import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useStorageUpload } from "@/hooks/use-storage-upload";

interface InspectionCameraProps {
  outletId: string;
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export function InspectionCamera({
  outletId,
  photos,
  onChange,
  maxPhotos = 4,
}: InspectionCameraProps) {
  const { upload, isUploading } = useStorageUpload();
  const [activeUploadIndex, setActiveUploadIndex] = useState<number | null>(
    null
  );

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photos.length >= maxPhotos) {
      toast.error(`Maksimal ${maxPhotos} foto inspeksi kendaraan.`);
      return;
    }

    try {
      setActiveUploadIndex(photos.length);
      const res = await upload(file, "INSPECTION", outletId);

      if (res && res.fileUrl) {
        onChange([...photos, res.fileUrl]);
        toast.success("Foto kondisi kendaraan berhasil disimpan.");
      }
    } catch {
      toast.error("Gagal mengunggah foto inspeksi.");
    } finally {
      setActiveUploadIndex(null);
      e.target.value = "";
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    onChange(photos.filter((_, i) => i !== indexToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
          <Camera className="h-3.5 w-3.5" />
          <span>
            Foto Inspeksi Fisik ({photos.length}/{maxPhotos})
          </span>
        </label>
        <span className="text-muted-foreground text-[11px]">
          Opsional (baret/spion)
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {/* Uploaded photo cards */}
        {photos.map((url, idx) => (
          <div
            key={url + idx}
            className="group bg-muted relative aspect-video overflow-hidden rounded-xl border shadow-xs sm:aspect-square"
          >
            <Image
              src={url}
              alt={`Foto Kondisi ${idx + 1}`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, 25vw"
            />
            <button
              type="button"
              onClick={() => handleRemovePhoto(idx)}
              className="bg-destructive/90 text-destructive-foreground absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full opacity-90 transition-opacity hover:opacity-100"
              title="Hapus foto"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {/* Upload Button */}
        {photos.length < maxPhotos && (
          <label className="border-border hover:border-primary hover:bg-primary/5 relative flex aspect-video cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-2 text-center transition-colors sm:aspect-square">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={isUploading}
              onChange={handleFileSelected}
              className="sr-only"
            />
            {isUploading && activeUploadIndex !== null ? (
              <div className="text-primary flex flex-col items-center gap-1">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-[11px] font-semibold">Mengunggah...</span>
              </div>
            ) : (
              <>
                <div className="bg-muted text-muted-foreground group-hover:text-primary flex h-8 w-8 items-center justify-center rounded-full">
                  <Camera className="h-4 w-4" />
                </div>
                <div className="text-foreground text-[11px] leading-tight font-medium">
                  <span className="text-primary font-semibold">
                    Kamera / File
                  </span>
                  <p className="text-muted-foreground text-[10px]">
                    Foto baret
                  </p>
                </div>
              </>
            )}
          </label>
        )}
      </div>
    </div>
  );
}
