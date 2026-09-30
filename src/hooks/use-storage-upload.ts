"use client";

import { useState } from "react";

import { DirectUploadResult, uploadFileToStorage } from "@/lib/storage/client";
import { UploadCategory } from "@/lib/storage/upload";

export function useStorageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (
    file: File,
    category: UploadCategory,
    companyId?: string
  ): Promise<DirectUploadResult | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const result = await uploadFileToStorage({
        file,
        category,
        companyId,
        onProgress: (p) => setProgress(p),
      });

      setIsUploading(false);
      return result;
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal mengunggah berkas. Silakan coba kembali.";
      setError(msg);
      setIsUploading(false);
      return null;
    }
  };

  const reset = () => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
  };

  return {
    upload,
    isUploading,
    progress,
    error,
    reset,
  };
}
