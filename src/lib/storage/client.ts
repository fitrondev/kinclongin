import { getPresignedUploadUrlAction } from "@/actions/storage";
import { UploadCategory } from "@/lib/storage/upload";

export interface DirectUploadOptions {
  file: File;
  category: UploadCategory;
  companyId?: string;
  onProgress?: (percent: number) => void;
}

export interface DirectUploadResult {
  storageKey: string;
  fileUrl: string;
  publicUrl: string | null;
  isPrivate: boolean;
}

/**
 * Mengupload berkas secara langsung dari browser ke SumoPod S3 via Presigned URL
 */
export async function uploadFileToStorage({
  file,
  category,
  companyId,
  onProgress,
}: DirectUploadOptions): Promise<DirectUploadResult> {
  // 1. Minta Presigned URL dari Server Action
  const response = await getPresignedUploadUrlAction({
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    fileSize: file.size,
    category,
    companyId,
  });

  if (!response.success || !response.data) {
    throw new Error(response.error || "Gagal mendapatkan izin upload.");
  }

  const { uploadUrl, storageKey, publicUrl, fileUrl, isPrivate } =
    response.data;

  // 2. Upload binary langsung ke SumoPod S3 dengan XMLHttpRequest untuk memantau progress
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream"
    );

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      // S3 PUT biasanya mengembalikan status 200 OK
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve();
      } else {
        reject(
          new Error(
            `Gagal mengunggah berkas ke storage (HTTP status: ${xhr.status} ${xhr.statusText}).`
          )
        );
      }
    };

    xhr.onerror = () => {
      reject(
        new Error(
          "Terjadi gangguan jaringan saat mengunggah berkas ke server storage."
        )
      );
    };

    xhr.send(file);
  });

  const computedFileUrl = fileUrl || `/api/storage/file/${storageKey}`;

  return {
    storageKey,
    fileUrl: computedFileUrl,
    // publicUrl diisi computedFileUrl agar form client yang mengecek res.publicUrl tetap berhasil
    publicUrl: publicUrl || computedFileUrl,
    isPrivate,
  };
}
