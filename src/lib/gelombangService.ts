import { supabase, isSupabaseConfigured } from './supabase';
import { logAdminAction } from './adminService';

export interface GelombangSesi {
  id: string;
  nama_sesi: string;
  kelas: string[]; // List of classes, e.g. ["GTK", "XII-1"]
  jam_mulai: string; // "07:00" format
  jam_selesai: string; // "08:00" format
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const STORAGE_KEY_CONFIG = 'ppu_gelombang_config_active';
const STORAGE_KEY_SESI = 'ppu_gelombang_sesi_list';

// Helper for parsing time to minutes for robust math, or string compare
export const checkTimeOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean => {
  return startA < endB && endA > startB;
};

// Return a string message indicating which class is clashing, if any, otherwise null
export const validateBentrokanGelombang = (
  kelas: string[],
  jamMulai: string,
  jamSelesai: string,
  excludeId: string | null,
  sesiList: GelombangSesi[]
): string | null => {
  for (const sesi of sesiList) {
    if (!sesi.is_active || (excludeId && sesi.id === excludeId)) {
      continue;
    }

    // Check time overlap
    if (checkTimeOverlap(jamMulai, jamSelesai, sesi.jam_mulai, sesi.jam_selesai)) {
      // Check shared classes
      for (const cls of kelas) {
        if (sesi.kelas.includes(cls)) {
          return `Kelas ${cls} sudah digunakan pada sesi lain di jam yang sama (${sesi.nama_sesi}: ${sesi.jam_mulai} - ${sesi.jam_selesai}).`;
        }
      }
    }
  }
  return null;
};

// --- GLOBAL CONFIG SERVICE ---

export const getGelombangConfigActive = async (): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    const local = localStorage.getItem(STORAGE_KEY_CONFIG);
    return local === 'true';
  }

  try {
    const { data, error } = await supabase
      .from('gelombang_config')
      .select('is_active')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      console.warn('Supabase error fetching gelombang_config, falling back to localStorage:', error);
      const local = localStorage.getItem(STORAGE_KEY_CONFIG);
      return local === 'true';
    }

    if (!data) {
      // Insert default row
      await supabase.from('gelombang_config').insert({ id: 'default', is_active: false });
      return false;
    }

    return !!data.is_active;
  } catch (err) {
    console.error('Error in getGelombangConfigActive:', err);
    const local = localStorage.getItem(STORAGE_KEY_CONFIG);
    return local === 'true';
  }
};

export const setGelombangConfigActive = async (
  isActive: boolean,
  adminEmail: string
): Promise<boolean> => {
  // Set local state anyway
  localStorage.setItem(STORAGE_KEY_CONFIG, String(isActive));

  let dbSuccess = false;
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('gelombang_config')
        .upsert({ id: 'default', is_active: isActive });
      dbSuccess = !error;
      if (error) {
        console.error('Supabase error updating gelombang_config:', error);
      }
    } catch (err) {
      console.error('Exception in setGelombangConfigActive:', err);
    }
  } else {
    dbSuccess = true; // offline mock mode
  }

  // Audit log
  await logAdminAction(
    adminEmail,
    `Mengubah Fitur Gelombang Voting`,
    `Status Fitur Gelombang Voting diubah menjadi: ${isActive ? 'AKTIF' : 'NONAKTIF'}`
  );

  return dbSuccess;
};

// --- SESI CRUD SERVICE ---

const readLocalSesi = (): GelombangSesi[] => {
  try {
    const str = localStorage.getItem(STORAGE_KEY_SESI);
    return str ? JSON.parse(str) : [];
  } catch {
    return [];
  }
};

const writeLocalSesi = (list: GelombangSesi[]) => {
  localStorage.setItem(STORAGE_KEY_SESI, JSON.stringify(list));
};

export const getGelombangSesiList = async (): Promise<GelombangSesi[]> => {
  if (!isSupabaseConfigured) {
    return readLocalSesi();
  }

  try {
    const { data, error } = await supabase
      .from('gelombang_voting')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase error fetching gelombang_voting, falling back to localStorage:', error);
      return readLocalSesi();
    }

    // Sync to localStorage as redundancy
    const parsed: GelombangSesi[] = (data || []).map((row: any) => ({
      id: row.id,
      nama_sesi: row.nama_sesi,
      kelas: Array.isArray(row.kelas) ? row.kelas : JSON.parse(row.kelas || '[]'),
      jam_mulai: row.jam_mulai,
      jam_selesai: row.jam_selesai,
      is_active: !!row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
    writeLocalSesi(parsed);
    return parsed;
  } catch (err) {
    console.error('Exception in getGelombangSesiList:', err);
    return readLocalSesi();
  }
};

export const generateSafeUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'uuid-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
};

export const addGelombangSesi = async (
  sesi: Omit<GelombangSesi, 'id' | 'created_at' | 'updated_at'>,
  adminEmail: string
): Promise<GelombangSesi | null> => {
  const newId = generateSafeUUID();
  const newSesi: GelombangSesi = {
    ...sesi,
    id: newId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Add locally first
  const localList = readLocalSesi();
  localList.unshift(newSesi);
  writeLocalSesi(localList);

  let success = true;
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('gelombang_voting').insert({
        id: newId,
        nama_sesi: sesi.nama_sesi,
        kelas: sesi.kelas, // will be written as jsonb list
        jam_mulai: sesi.jam_mulai,
        jam_selesai: sesi.jam_selesai,
        is_active: sesi.is_active,
      });
      if (error) {
        console.error('Supabase error adding gelombang sesi:', error);
        success = false;
      }
    } catch (err) {
      console.error('Exception in addGelombangSesi:', err);
      success = false;
    }
  }

  await logAdminAction(
    adminEmail,
    'Menambah Gelombang Sesi',
    `Sesi "${sesi.nama_sesi}" (${sesi.jam_mulai}-${sesi.jam_selesai}) untuk kelas: ${sesi.kelas.join(', ')}`
  );

  return success ? newSesi : null;
};

export const updateGelombangSesi = async (
  id: string,
  updatedData: Partial<Omit<GelombangSesi, 'id'>>,
  adminEmail: string
): Promise<boolean> => {
  const localList = readLocalSesi();
  const idx = localList.findIndex((s) => s.id === id);
  if (idx !== -1) {
    localList[idx] = {
      ...localList[idx],
      ...updatedData,
      updated_at: new Date().toISOString(),
    };
    writeLocalSesi(localList);
  }

  let dbSuccess = false;
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('gelombang_voting')
        .update({
          ...updatedData,
        })
        .eq('id', id);

      dbSuccess = !error;
      if (error) {
        console.error('Supabase error updating gelombang sesi:', error);
      }
    } catch (err) {
      console.error('Exception in updateGelombangSesi:', err);
    }
  } else {
    dbSuccess = true;
  }

  const sesName = updatedData.nama_sesi || (idx !== -1 ? localList[idx].nama_sesi : 'Sesi');
  await logAdminAction(
    adminEmail,
    'Memperbarui Gelombang Sesi',
    `Sesi "${sesName}" berhasil diperbarui atau diubah statusnya.`
  );

  return dbSuccess;
};

export const deleteGelombangSesi = async (id: string, adminEmail: string): Promise<boolean> => {
  const localList = readLocalSesi();
  const sesiToDelete = localList.find((s) => s.id === id);
  const updated = localList.filter((s) => s.id !== id);
  writeLocalSesi(updated);

  let dbSuccess = false;
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('gelombang_voting').delete().eq('id', id);
      dbSuccess = !error;
      if (error) {
        console.error('Supabase error deleting gelombang sesi:', error);
      }
    } catch (err) {
      console.error('Exception in deleteGelombangSesi:', err);
    }
  } else {
    dbSuccess = true;
  }

  if (sesiToDelete) {
    await logAdminAction(
      adminEmail,
      'Menghapus Gelombang Sesi',
      `Sesi "${sesiToDelete.nama_sesi}" (${sesiToDelete.jam_mulai}-${sesiToDelete.jam_selesai}) berhasil dihapus.`
    );
  }

  return dbSuccess;
};
