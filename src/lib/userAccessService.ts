import { supabase, isSupabaseConfigured } from './supabase';

export interface UserAccessSettings {
  signup_enabled: boolean;
  lihat_hasil_enabled: boolean;
  edit_profil_enabled: boolean;
  download_kartu_enabled: boolean;
  visibilitas_kartu_enabled: boolean;
  maintenance_enabled: boolean;
}

const DEFAULT_SETTINGS: UserAccessSettings = {
  signup_enabled: true,
  lihat_hasil_enabled: true,
  edit_profil_enabled: true,
  download_kartu_enabled: true,
  visibilitas_kartu_enabled: true,
  maintenance_enabled: false,
};

const STORAGE_KEY = 'ppu_user_access_settings';

export const getUserAccessSettings = async (): Promise<UserAccessSettings> => {
  // Graceful fallback if not configured
  if (!isSupabaseConfigured) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_access_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      console.warn('Database user_access_settings table not found or loaded incorrectly, using localStorage:', error.message);
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
        return DEFAULT_SETTINGS;
      }
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }

    if (!data) {
      // Table exists but record doesn't, insert default settings
      const { error: insertError } = await supabase
        .from('user_access_settings')
        .insert({
          id: 'default',
          ...DEFAULT_SETTINGS,
        });

      if (insertError) {
        console.error('Failed to create default user access settings record:', insertError.message);
      }
      return DEFAULT_SETTINGS;
    }

    return {
      signup_enabled: data.signup_enabled !== false,
      lihat_hasil_enabled: data.lihat_hasil_enabled !== false,
      edit_profil_enabled: data.edit_profil_enabled !== false,
      download_kartu_enabled: data.download_kartu_enabled !== false,
      visibilitas_kartu_enabled: data.visibilitas_kartu_enabled !== false,
      maintenance_enabled: data.maintenance_enabled === true,
    };
  } catch (err) {
    console.error('Error fetching user access settings, falling back to local storage:', err);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
};

export const saveUserAccessSettings = async (settings: UserAccessSettings): Promise<boolean> => {
  // Always update localStorage first
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

  if (!isSupabaseConfigured) {
    return true;
  }

  try {
    const { error } = await supabase
      .from('user_access_settings')
      .upsert({
        id: 'default',
        signup_enabled: settings.signup_enabled,
        lihat_hasil_enabled: settings.lihat_hasil_enabled,
        edit_profil_enabled: settings.edit_profil_enabled,
        download_kartu_enabled: settings.download_kartu_enabled,
        visibilitas_kartu_enabled: settings.visibilitas_kartu_enabled,
        maintenance_enabled: settings.maintenance_enabled,
      });

    if (error) {
      console.warn('Failed to upsert to Supabase user_access_settings:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving user access settings to Supabase:', err);
    return false;
  }
};
