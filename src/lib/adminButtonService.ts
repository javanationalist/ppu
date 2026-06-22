import { supabase, isSupabaseConfigured } from './supabase';

export interface AdminButtonSettings {
  gelombang_voting: boolean;
  kelola_kategori: boolean;
  kelola_kandidat: boolean;
  konfirmasi_pemilih: boolean;
  kelola_pemilih: boolean;
  wafo: boolean;
  kelola_helpdesk: boolean;
  visibilitas_user: boolean;
  hasil_voting: boolean;
  audit_log: boolean;
  export_data: boolean;
  maintenance: boolean;
}

const DEFAULT_BUTTON_SETTINGS: AdminButtonSettings = {
  gelombang_voting: true,
  kelola_kategori: true,
  kelola_kandidat: true,
  konfirmasi_pemilih: true,
  kelola_pemilih: true,
  wafo: true,
  kelola_helpdesk: true,
  visibilitas_user: true,
  hasil_voting: true,
  audit_log: true,
  export_data: true,
  maintenance: true,
};

const STORAGE_KEY = 'ppu_admin_button_settings';

export const getAdminButtonSettings = async (): Promise<AdminButtonSettings> => {
  if (!isSupabaseConfigured) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BUTTON_SETTINGS));
      return DEFAULT_BUTTON_SETTINGS;
    }
    try {
      return { ...DEFAULT_BUTTON_SETTINGS, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_BUTTON_SETTINGS;
    }
  }

  try {
    const { data, error } = await supabase
      .from('admin_button')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      console.warn('Database admin_button table not found or loaded incorrectly, using localStorage:', error.message);
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BUTTON_SETTINGS));
        return DEFAULT_BUTTON_SETTINGS;
      }
      try {
        return { ...DEFAULT_BUTTON_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_BUTTON_SETTINGS;
      }
    }

    if (!data) {
      // Table exists but record doesn't, insert default settings
      const { error: insertError } = await supabase
        .from('admin_button')
        .insert({
          id: 'default',
          ...DEFAULT_BUTTON_SETTINGS,
        });

      if (insertError) {
        console.error('Failed to create default admin button settings record:', insertError.message);
      }
      return DEFAULT_BUTTON_SETTINGS;
    }

    return {
      gelombang_voting: data.gelombang_voting !== false,
      kelola_kategori: data.kelola_kategori !== false,
      kelola_kandidat: data.kelola_kandidat !== false,
      konfirmasi_pemilih: data.konfirmasi_pemilih !== false,
      kelola_pemilih: data.kelola_pemilih !== false,
      wafo: data.wafo !== false,
      kelola_helpdesk: data.kelola_helpdesk !== false,
      visibilitas_user: data.visibilitas_user !== false,
      hasil_voting: data.hasil_voting !== false,
      audit_log: data.audit_log !== false,
      export_data: data.export_data !== false,
      maintenance: data.maintenance !== false,
    };
  } catch (err) {
    console.error('Error fetching admin button settings, falling back to local storage:', err);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_BUTTON_SETTINGS;
    try {
      return { ...DEFAULT_BUTTON_SETTINGS, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_BUTTON_SETTINGS;
    }
  }
};

export const saveAdminButtonSettings = async (settings: AdminButtonSettings): Promise<boolean> => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

  if (!isSupabaseConfigured) {
    return true;
  }

  try {
    const { error } = await supabase
      .from('admin_button')
      .upsert({
        id: 'default',
        gelombang_voting: settings.gelombang_voting,
        kelola_kategori: settings.kelola_kategori,
        kelola_kandidat: settings.kelola_kandidat,
        konfirmasi_pemilih: settings.konfirmasi_pemilih,
        kelola_pemilih: settings.kelola_pemilih,
        wafo: settings.wafo,
        kelola_helpdesk: settings.kelola_helpdesk,
        visibilitas_user: settings.visibilitas_user,
        hasil_voting: settings.hasil_voting,
        audit_log: settings.audit_log,
        export_data: settings.export_data,
        maintenance: settings.maintenance,
      });

    if (error) {
      console.warn('Failed to upsert to Supabase admin_button:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving admin button settings to Supabase:', err);
    return false;
  }
};
