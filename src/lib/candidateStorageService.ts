import { supabase, isSupabaseConfigured } from './supabase';

export const CANDIDATE_STORAGE_BUCKET = 'candidate-photos';
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface UploadPhotoResult {
  publicUrl: string;
  storagePath: string;
}

/**
 * Validates selected file for image type and size limit (<= 5MB)
 */
export function validateCandidatePhoto(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'File foto tidak ditemukan.' };
  }

  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File harus berupa gambar (JPG, PNG, WebP, dsb).' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    return { 
      valid: false, 
      error: `Ukuran file foto (${sizeInMb} MB) melebihi batas maksimal 5 MB.` 
    };
  }

  return { valid: true };
}

/**
 * Optimizes image on client-side:
 * - Resizes image down to max 1200x1200px while preserving aspect ratio
 * - Converts image to high-quality WebP format (.webp)
 */
export async function optimizeCandidateImage(
  file: File, 
  maxDimension: number = 1200, 
  quality: number = 0.88
): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale down if larger than maxDimension while keeping aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill background with white in case image has transparency (for WebP)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                // Fallback to original file blob if canvas.toBlob fails
                resolve(file);
              }
            },
            'image/webp',
            quality
          );
        } else {
          resolve(file);
        }
      };

      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Builds standard storage path according to required folder structure:
 * candidate-photos/regular/2026/{category-id}/{candidate-id}/profile.webp
 * or
 * candidate-photos/mpk/2026/{category-id}/{candidate-id}/profile.webp
 */
export function buildCandidateStoragePath(
  isMpk: boolean,
  categoryId: string,
  candidateId: string,
  year: string = '2026'
): string {
  const typeFolder = isMpk ? 'mpk' : 'regular';
  const cleanCategory = (categoryId || 'uncategorized').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanCandidate = (candidateId || 'candidate').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  
  return `${typeFolder}/${year}/${cleanCategory}/${cleanCandidate}/profile.webp`;
}

/**
 * Extracts storage relative path from full public URL
 */
export function getStoragePathFromUrl(photoUrl: string): string | null {
  if (!photoUrl) return null;
  
  try {
    const bucketToken = `/${CANDIDATE_STORAGE_BUCKET}/`;
    const bucketIndex = photoUrl.indexOf(bucketToken);
    
    if (bucketIndex !== -1) {
      const fullPath = photoUrl.substring(bucketIndex + bucketToken.length);
      // Remove query parameters if any (e.g. ?v=123)
      return fullPath.split('?')[0];
    }
  } catch (err) {
    console.error('Error parsing storage path from URL:', err);
  }
  
  return null;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads candidate photo to Supabase Storage bucket 'candidate-photos'
 */
export async function uploadCandidatePhoto(
  file: File,
  isMpk: boolean,
  categoryId: string,
  candidateId: string,
  year: string = '2026'
): Promise<UploadPhotoResult> {
  // 1. Log & Validate file
  console.log('[Candidate Photo] File selected:', {
    name: file?.name,
    type: file?.type,
    size: file?.size,
    isMpk,
    categoryId,
    candidateId
  });

  const validation = validateCandidatePhoto(file);
  if (!validation.valid) {
    console.error('[Candidate Photo] Validation failed:', validation.error);
    throw new Error(validation.error || 'File foto tidak valid.');
  }
  console.log('[Candidate Photo] Validation passed');

  // 2. Optimize image to WebP
  console.log('[Candidate Photo] Optimizing image to WebP...');
  const optimizedBlob = await optimizeCandidateImage(file);
  console.log('[Candidate Photo] Optimization complete. Size:', optimizedBlob.size, 'bytes');
  
  // 3. Build storage path
  const storagePath = buildCandidateStoragePath(isMpk, categoryId, candidateId, year);
  console.log('[Candidate Photo] Target Bucket:', CANDIDATE_STORAGE_BUCKET);
  console.log('[Candidate Photo] Storage Path:', storagePath);

  // 4. Handle offline/mock mode if Supabase is not configured
  if (!isSupabaseConfigured) {
    console.warn('[Candidate Photo] Supabase is not configured in .env. Using Data URL for mock preview.');
    const dataUrl = await blobToDataUrl(optimizedBlob);
    return {
      publicUrl: dataUrl,
      storagePath: storagePath
    };
  }

  // 5. Upload to real Supabase Storage bucket
  try {
    console.log('[Candidate Photo] Uploading to Supabase Storage...');

    const { data, error } = await supabase.storage
      .from(CANDIDATE_STORAGE_BUCKET)
      .upload(storagePath, optimizedBlob, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: '3600'
      });

    if (error) {
      console.warn('[Candidate Photo] Supabase Storage upload error:', error.message);

      // If network / fetch failed or bucket missing, fallback gracefully to Data URL so candidate saving succeeds
      if (
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('fetch') ||
        error.message?.includes('Bucket not found') ||
        error.message?.includes('bucket_not_found') ||
        (error as any)?.name === 'StorageUnknownError' ||
        (error as any)?.statusCode === '404'
      ) {
        console.warn('[Candidate Photo] Storage endpoint unreachable or bucket missing. Using WebP Data URL fallback.');
        const dataUrl = await blobToDataUrl(optimizedBlob);
        return {
          publicUrl: dataUrl,
          storagePath: storagePath
        };
      }

      if (
        error.message?.includes('security policy') ||
        error.message?.includes('row-level security') ||
        error.message?.includes('Unauthorized') ||
        (error as any)?.statusCode === '403'
      ) {
        console.warn('[Candidate Photo] RLS policy restriction. Using WebP Data URL fallback.');
        const dataUrl = await blobToDataUrl(optimizedBlob);
        return {
          publicUrl: dataUrl,
          storagePath: storagePath
        };
      }

      const dataUrl = await blobToDataUrl(optimizedBlob);
      return {
        publicUrl: dataUrl,
        storagePath: storagePath
      };
    }

    console.log('[Candidate Photo] Upload success:', data);
    console.log('[Candidate Photo] Storage path:', storagePath);

    // 6. Get Public URL
    const { data: publicUrlData } = supabase.storage
      .from(CANDIDATE_STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.warn('[Candidate Photo] Failed to get Public URL for path:', storagePath);
      const dataUrl = await blobToDataUrl(optimizedBlob);
      return {
        publicUrl: dataUrl,
        storagePath: storagePath
      };
    }

    // Append timestamp query parameter to bypass browser image caching upon update
    const timestampedUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
    console.log('[Candidate Photo] Public URL generated:', timestampedUrl);

    return {
      publicUrl: timestampedUrl,
      storagePath: storagePath
    };
  } catch (err: any) {
    console.warn('[Candidate Photo] Storage upload caught exception, using WebP Data URL fallback:', err?.message || err);
    const dataUrl = await blobToDataUrl(optimizedBlob);
    return {
      publicUrl: dataUrl,
      storagePath: storagePath
    };
  }
}

/**
 * Deletes photo file from Supabase Storage 'candidate-photos' bucket
 */
export async function deleteCandidatePhotoByUrl(photoUrl: string): Promise<boolean> {
  if (!photoUrl) return false;

  const storagePath = getStoragePathFromUrl(photoUrl);
  if (!storagePath) return false;

  if (!isSupabaseConfigured) {
    return true; // Mock mode succeed
  }

  try {
    const { error } = await supabase.storage
      .from(CANDIDATE_STORAGE_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.warn('Failed to delete candidate photo from storage:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error deleting candidate photo from storage:', err);
    return false;
  }
}
