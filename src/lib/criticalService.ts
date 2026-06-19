
import { supabase } from './supabase';

// Helper to get or set critical settings
export const getCriticalSetting = async (key: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('critical_settings')
      .select('value_boolean, value_string')
      .eq('key', key)
      .single();
    if (error || !data) return null;
    return data.value_boolean !== null ? data.value_boolean : data.value_string;
  } catch (err) {
    console.error(`Error fetching setting ${key}:`, err);
    return null;
  }
};

export const setCriticalSetting = async (key: string, value: boolean | string): Promise<boolean> => {
  try {
    const updateData = typeof value === 'boolean' 
        ? { value_boolean: value }
        : { value_string: value };
    const { error } = await supabase
      .from('critical_settings')
      .update(updateData)
      .eq('key', key);
    return !error;
  } catch (err) {
    console.error(`Error setting setting ${key}:`, err);
    return false;
  }
};

// Verify critical access code
export const verifyCriticalAccessCode = async (code: string): Promise<boolean> => {
    const storedCode = await getCriticalSetting('admin_access_code');
    return storedCode === code;
};

// Alias for specific settings
export const getVotingStatus = async (): Promise<boolean> => {
    return await getCriticalSetting('voting_active') ?? false;
};

export const setVotingStatus = async (active: boolean): Promise<boolean> => {
    return await setCriticalSetting('voting_active', active);
};

export const getMaintenanceMode = async (): Promise<boolean> => {
    return await getCriticalSetting('maintenance_mode') ?? false;
};

export const setMaintenanceMode = async (active: boolean): Promise<boolean> => {
    return await setCriticalSetting('maintenance_mode', active);
};
