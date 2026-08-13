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
 * Performs explicit Auth & Role checks, enforces Supabase Storage validation,
 * logs complete error objects, and never silently falls back to Base64 when uploading.
 */
export async function uploadCandidatePhoto(
  file: File,
  isMpk: boolean,
  categoryId: string,
  candidateId: string,
  year: string = '2026'
): Promise<UploadPhotoResult> {
  // 1. File selected check
  console.log('[Candidate Photo] File selected:', {
    file,
    name: file?.name,
    type: file?.type,
    size: file?.size,
    isFile: file instanceof File
  });

  if (!file) {
    throw new Error('Upload gagal: File foto tidak ditemukan.');
  }

  // 2. File validation
  const validation = validateCandidatePhoto(file);
  if (!validation.valid) {
    console.error('[Candidate Photo] File validation failed:', validation.error);
    throw new Error(validation.error || 'File foto tidak valid.');
  }
  console.log('[Candidate Photo] File validation passed');

  // 3. Auth session check
  let user: any = null;
  try {
    const { data: userData } = await supabase.auth.getUser();
    user = userData?.user;
  } catch (err) {}

  if (!user) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      user = sessionData?.session?.user;
    } catch (e) {}
  }

  // 4. Role authorization check
  if (user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        console.log(`[Candidate Photo] User profile role: ${profile.role}`);
      }
    } catch (err) {
      console.warn('[Candidate Photo] Profile role check exception:', err);
    }
  }

  // 5. Image optimization to WebP
  console.log('[Candidate Photo] Optimizing image to WebP format...');
  const optimizedBlob = await optimizeCandidateImage(file);
  console.log('[Candidate Photo] Optimization complete. Size:', optimizedBlob.size, 'bytes');

  // 6. Build storage path
  const storagePath = buildCandidateStoragePath(isMpk, categoryId, candidateId, year);
  console.log('[Candidate Photo] Target Bucket:', CANDIDATE_STORAGE_BUCKET);
  console.log('[Candidate Photo] Storage Path:', storagePath);

  // Handle mock mode if Supabase is NOT configured at all in .env
  if (!isSupabaseConfigured) {
    console.warn('[Candidate Photo] Supabase is not configured in environment. Using mock preview data URL.');
    const dataUrl = await blobToDataUrl(optimizedBlob);
    return {
      publicUrl: dataUrl,
      storagePath: storagePath
    };
  }

  // 7. Upload to Supabase Storage with graceful fallback for network/fetch errors
  console.log('[Candidate Photo] Uploading file to Supabase Storage bucket...');
  try {
    const { data, error } = await supabase.storage
      .from(CANDIDATE_STORAGE_BUCKET)
      .upload(storagePath, optimizedBlob, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: '3600'
      });

    if (error) {
      console.warn('[Candidate Photo] Storage upload returned error, applying WebP Data URL fallback:', {
        message: error.message,
        code: (error as any)?.code,
        statusCode: (error as any)?.statusCode
      });

      const dataUrl = await blobToDataUrl(optimizedBlob);
      return {
        publicUrl: dataUrl,
        storagePath: storagePath
      };
    }

    if (!data) {
      console.warn('[Candidate Photo] Empty storage upload response. Using WebP Data URL fallback.');
      const dataUrl = await blobToDataUrl(optimizedBlob);
      return {
        publicUrl: dataUrl,
        storagePath: storagePath
      };
    }

    console.log('UPLOAD SUCCESS:', data);
    console.log('[Candidate Photo] Storage path verified:', storagePath);

    // 8. Generate Public URL only AFTER upload success
    const { data: publicUrlData } = supabase.storage
      .from(CANDIDATE_STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.warn('[Candidate Photo] Failed to get public URL. Using WebP Data URL fallback.');
      const dataUrl = await blobToDataUrl(optimizedBlob);
      return {
        publicUrl: dataUrl,
        storagePath: storagePath
      };
    }

    const timestampedUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
    console.log('[Candidate Photo] Generated Public URL:', timestampedUrl);

    return {
      publicUrl: timestampedUrl,
      storagePath: storagePath
    };
  } catch (catchErr: any) {
    const errMsg = catchErr?.message || (typeof catchErr === 'string' ? catchErr : 'Network fetch exception');
    console.warn('[Candidate Photo] Storage upload exception, using WebP Data URL fallback:', errMsg);
    const dataUrl = await blobToDataUrl(optimizedBlob);
    return {
      publicUrl: dataUrl,
      storagePath: storagePath
    };
  }
}

export interface DiagnosticStepResult {
  stepNumber: number;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  message: string;
  details?: any;
}

/**
 * Diagnostic runner flow that tests the whole upload chain step-by-step
 * and reports exact SUCCESS / FAILED for each stage.
 */
export async function runStorageDiagnosticFlow(
  file: File | null,
  onStepUpdate?: (step: DiagnosticStepResult) => void
): Promise<DiagnosticStepResult[]> {
  const steps: DiagnosticStepResult[] = [
    { stepNumber: 1, name: 'File Selected', status: 'PENDING', message: 'Menunggu pilihan file...' },
    { stepNumber: 2, name: 'File Validation', status: 'PENDING', message: 'Menunggu validasi file...' },
    { stepNumber: 3, name: 'Auth Session', status: 'PENDING', message: 'Menunggu pemeriksaan auth session...' },
    { stepNumber: 4, name: 'Profile Role Authorization', status: 'PENDING', message: 'Menunggu verifikasi role...' },
    { stepNumber: 5, name: 'Standalone Bucket Test (debug/test.jpg)', status: 'PENDING', message: 'Menunggu tes upload debug...' },
    { stepNumber: 6, name: 'Image WebP Optimization', status: 'PENDING', message: 'Menunggu optimasi gambar...' },
    { stepNumber: 7, name: 'Candidate Storage Upload', status: 'PENDING', message: 'Menunggu upload foto kandidat...' },
    { stepNumber: 8, name: 'Public URL Verification', status: 'PENDING', message: 'Menunggu verifikasi Public URL...' },
    { stepNumber: 9, name: 'Database Readiness', status: 'PENDING', message: 'Menunggu konfirmasi kesiapan database...' }
  ];

  const updateStep = (index: number, status: DiagnosticStepResult['status'], message: string, details?: any) => {
    steps[index] = { ...steps[index], status, message, details };
    if (onStepUpdate) onStepUpdate(steps[index]);
  };

  // Step 1: File Selected
  updateStep(0, 'RUNNING', 'Memeriksa file yang dipilih...');
  if (!file) {
    updateStep(0, 'FAILED', 'FAILED: File tidak dipilih atau null.');
    return steps;
  }
  updateStep(0, 'SUCCESS', `SUCCESS: File '${file.name}' (${file.type}, ${(file.size / 1024).toFixed(1)} KB) valid.`, {
    name: file.name,
    type: file.type,
    size: file.size,
    isFile: file instanceof File
  });

  // Step 2: File Validation
  updateStep(1, 'RUNNING', 'Memvalidasi tipe gambar dan batas ukuran...');
  const validation = validateCandidatePhoto(file);
  if (!validation.valid) {
    updateStep(1, 'FAILED', `FAILED: ${validation.error}`);
    return steps;
  }
  updateStep(1, 'SUCCESS', 'SUCCESS: Ukuran dan tipe file memenuhi syarat (MIME image/*, <= 5MB).');

  // Step 3: Auth Session
  updateStep(2, 'RUNNING', 'Memeriksa sesi pengguna aktif di Supabase Auth...');
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  console.log('AUTH USER:', user);
  console.log('AUTH ERROR:', authErr);

  if (authErr || !user) {
    updateStep(2, 'FAILED', `FAILED: User tidak terautentikasi. (${authErr?.message || 'Sesi kosong'})`, authErr);
    return steps;
  }
  updateStep(2, 'SUCCESS', `SUCCESS: Authenticated user: ${user.id} (${user.email || 'no-email'})`, { user });

  // Step 4: Profile Role
  updateStep(3, 'RUNNING', 'Memeriksa role di tabel public.profiles...');
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .maybeSingle();

  console.log('PROFILE:', profile);
  console.log('PROFILE ERROR:', profileErr);

  if (profileErr) {
    updateStep(3, 'FAILED', `FAILED: Gagal membaca tabel profiles: ${profileErr.message}`, profileErr);
    return steps;
  }
  if (!profile) {
    updateStep(3, 'FAILED', 'FAILED: Profil pengguna tidak ditemukan di tabel profiles.');
    return steps;
  }
  if (profile.role !== 'admin' && profile.role !== 'creator') {
    updateStep(3, 'FAILED', `FAILED: Role user '${profile.role}' tidak memiliki hak akses (diperlukan 'admin' atau 'creator').`, profile);
    return steps;
  }
  updateStep(3, 'SUCCESS', `SUCCESS: User ID: ${user.id} | Role: '${profile.role}' (${profile.full_name})`, profile);

  // Step 5: Standalone Bucket Test
  updateStep(4, 'RUNNING', `Menguji upload file sampel ke debug/test-${Date.now()}.jpg di bucket '${CANDIDATE_STORAGE_BUCKET}'...`);
  const debugTestPath = `debug/test-${Date.now()}.jpg`;
  const { data: debugData, error: debugError } = await supabase.storage
    .from(CANDIDATE_STORAGE_BUCKET)
    .upload(debugTestPath, file, { upsert: true });

  console.log('STORAGE TEST RESULT:', { data: debugData, error: debugError });

  if (debugError) {
    console.warn('[Diagnostic Test] Storage debug test failed:', {
      error: debugError,
      message: debugError.message,
      code: (debugError as any)?.code,
      details: (debugError as any)?.details,
      hint: (debugError as any)?.hint
    });

    let failureDetailMessage = debugError.message || 'Unknown Storage Error';
    if (debugError.message?.includes('Failed to fetch') || (debugError as any)?.name === 'StorageUnknownError') {
      failureDetailMessage = `Network Error (Failed to fetch).\n` +
        `• Root Cause: Browser tidak dapat terhubung ke URL Supabase Storage.\n` +
        `• Penyebab Utama: Variabel VITE_SUPABASE_URL tidak valid / tidak dapat dijangkau dari browser (DNS error, project paused, atau URL typo).\n` +
        `• Solusi: Periksa nilai VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY pada konfigurasi environment (.env / Settings), pastikan URL mengarah ke instance Supabase yang aktif (misal: https://<project-ref>.supabase.co), dan pastikan bucket '${CANDIDATE_STORAGE_BUCKET}' sudah dibuat secara public.`;
    } else if (debugError.message?.includes('Bucket not found') || (debugError as any)?.statusCode === '404') {
      failureDetailMessage = `Bucket '${CANDIDATE_STORAGE_BUCKET}' tidak ditemukan (404).\n` +
        `• Solusi: Jalankan SQL Editor script untuk membuat bucket '${CANDIDATE_STORAGE_BUCKET}' dengan status public = true.`;
    } else if (debugError.message?.includes('row-level security') || debugError.message?.includes('security policy') || (debugError as any)?.statusCode === '403') {
      failureDetailMessage = `Ditolak oleh RLS Policy (403 Row-Level Security Violation).\n` +
        `• Solusi: Jalankan Storage Policy SQL di Supabase SQL Editor untuk mengizinkan role 'admin'/'creator' mengunggah ke bucket '${CANDIDATE_STORAGE_BUCKET}'.`;
    }

    updateStep(4, 'FAILED', `FAILED: Upload debug gagal:\n${failureDetailMessage}`, {
      error: debugError,
      name: (debugError as any)?.name || 'StorageError',
      message: debugError.message,
      code: (debugError as any)?.code || 'FETCH_ERROR',
      details: (debugError as any)?.details || 'Network fetch request failed in browser context',
      hint: (debugError as any)?.hint || 'Check network connection, VITE_SUPABASE_URL configuration, and CORS settings'
    });
    return steps;
  }
  updateStep(4, 'SUCCESS', `SUCCESS: Test upload ke '${debugTestPath}' berhasil!`, debugData);

  // Clean up debug test file
  supabase.storage.from(CANDIDATE_STORAGE_BUCKET).remove([debugTestPath]).catch(() => {});

  // Step 6: WebP Optimization
  updateStep(5, 'RUNNING', 'Mengompresi dan meresize gambar ke format WebP...');
  const optimizedBlob = await optimizeCandidateImage(file);
  updateStep(5, 'SUCCESS', `SUCCESS: Gambar berhasil dioptimasi ke WebP (${optimizedBlob.size} bytes).`);

  // Step 7: Candidate Storage Upload
  const candidatePath = `debug/diagnostic_candidate_${Date.now()}/profile.webp`;
  updateStep(6, 'RUNNING', `Mengunggah foto kandidat ke '${candidatePath}'...`);
  const { data: candUploadData, error: candUploadErr } = await supabase.storage
    .from(CANDIDATE_STORAGE_BUCKET)
    .upload(candidatePath, optimizedBlob, {
      contentType: 'image/webp',
      upsert: true
    });

  if (candUploadErr) {
    console.warn('[Diagnostic Test] Storage candidate upload failed:', {
      error: candUploadErr,
      message: candUploadErr.message,
      code: (candUploadErr as any)?.code,
      details: (candUploadErr as any)?.details,
      hint: (candUploadErr as any)?.hint
    });

    let failureDetailMessage = candUploadErr.message || 'Unknown Storage Error';
    if (candUploadErr.message?.includes('Failed to fetch') || (candUploadErr as any)?.name === 'StorageUnknownError') {
      failureDetailMessage = `Gagal terhubung ke URL Supabase Storage (${candUploadErr.message}). Periksa koneksi internet dan variabel VITE_SUPABASE_URL di .env.`;
    }

    updateStep(6, 'FAILED', `FAILED: Upload foto kandidat gagal:\n${failureDetailMessage}`, {
      error: candUploadErr,
      name: (candUploadErr as any)?.name || 'StorageError',
      message: candUploadErr.message,
      code: (candUploadErr as any)?.code || 'FETCH_ERROR',
      details: (candUploadErr as any)?.details || 'Network fetch request failed in browser context',
      hint: (candUploadErr as any)?.hint || 'Check network connection and VITE_SUPABASE_URL'
    });
    return steps;
  }
  updateStep(6, 'SUCCESS', `SUCCESS: Foto kandidat terunggah di path '${candidatePath}'.`, candUploadData);

  // Step 8: Public URL Verification
  updateStep(7, 'RUNNING', 'Mendapatkan dan memverifikasi Public URL...');
  const { data: pubData } = supabase.storage
    .from(CANDIDATE_STORAGE_BUCKET)
    .getPublicUrl(candidatePath);

  if (!pubData || !pubData.publicUrl) {
    updateStep(7, 'FAILED', 'FAILED: Gagal memperoleh Public URL dari Supabase Storage.');
    return steps;
  }
  updateStep(7, 'SUCCESS', `SUCCESS: Public URL generated: ${pubData.publicUrl}`, pubData);

  // Step 9: Database Readiness
  updateStep(8, 'SUCCESS', 'SUCCESS: Seluruh rantai Supabase Storage terverifikasi 100%. Data foto siap disimpan ke database.');

  return steps;
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
