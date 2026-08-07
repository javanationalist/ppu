import { supabase, isSupabaseConfigured } from './supabase';
import { HelpdeskButton } from '../types';

const MOCK_STORAGE_KEY = 'ppu_helpdesk_buttons';

const defaultHelpdeskButtons: HelpdeskButton[] = [
  {
    id: 'hd-default-1',
    label: 'WhatsApp',
    url: 'https://wa.me/6285117082882',
  },
  {
    id: 'hd-default-2',
    label: 'Instagram',
    url: 'https://instagram.com/osis.sman1bangsal',
  },
];

export const getHelpdeskButtons = async (): Promise<HelpdeskButton[]> => {
  if (!isSupabaseConfigured) {
    const saved = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(defaultHelpdeskButtons));
      return defaultHelpdeskButtons;
    }
    return JSON.parse(saved);
  }

  const { data, error } = await supabase
    .from('helpdesk_buttons')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    if (import.meta.env.DEV) console.warn('[DB] GET helpdesk_buttons warning:', error.message || error);
    const saved = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(defaultHelpdeskButtons));
      return defaultHelpdeskButtons;
    }
    return JSON.parse(saved);
  }

  if (!data || data.length === 0) {
    const { error: insertError } = await supabase
      .from('helpdesk_buttons')
      .insert(defaultHelpdeskButtons);

    if (insertError && import.meta.env.DEV) {
      console.warn('[DB] INSERT default helpdesk_buttons warning:', insertError.message);
    }
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(defaultHelpdeskButtons));
    return defaultHelpdeskButtons;
  }

  if (import.meta.env.DEV) console.log('[DB] GET helpdesk_buttons SUCCESS', data.length);
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(data));
  return data as HelpdeskButton[];
};

export const saveHelpdeskButton = async (button: Omit<HelpdeskButton, 'id'> & { id?: string }): Promise<HelpdeskButton> => {
  const newButton: HelpdeskButton = {
    id: button.id || 'hd-' + Math.random().toString(36).substring(2, 9),
    label: button.label,
    url: button.url,
  };

  if (!isSupabaseConfigured) {
    const current = await getHelpdeskButtons();
    const existingIndex = current.findIndex(b => b.id === newButton.id);
    if (existingIndex >= 0) {
      current[existingIndex] = newButton;
    } else {
      current.push(newButton);
    }
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(current));
    return newButton;
  }

  const { error } = await supabase
    .from('helpdesk_buttons')
    .upsert(newButton);

  if (error) {
    if (import.meta.env.DEV) console.warn('[DB] UPSERT helpdesk_buttons warning:', error.message || error);
    const saved = localStorage.getItem(MOCK_STORAGE_KEY);
    const current: HelpdeskButton[] = saved ? JSON.parse(saved) : [...defaultHelpdeskButtons];
    const existingIndex = current.findIndex(b => b.id === newButton.id);
    if (existingIndex >= 0) {
      current[existingIndex] = newButton;
    } else {
      current.push(newButton);
    }
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(current));
    return newButton;
  }

  if (import.meta.env.DEV) console.log('[DB] UPSERT helpdesk_buttons SUCCESS', newButton.id);
  return newButton;
};

export const deleteHelpdeskButton = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    const current = await getHelpdeskButtons();
    const filtered = current.filter(b => b.id !== id);
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }

  const { error } = await supabase
    .from('helpdesk_buttons')
    .delete()
    .eq('id', id);

  if (error) {
    if (import.meta.env.DEV) console.warn('[DB] DELETE helpdesk_buttons warning:', error.message || error);
    const saved = localStorage.getItem(MOCK_STORAGE_KEY);
    const current: HelpdeskButton[] = saved ? JSON.parse(saved) : [...defaultHelpdeskButtons];
    const filtered = current.filter(b => b.id !== id);
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }

  if (import.meta.env.DEV) console.log('[DB] DELETE helpdesk_buttons SUCCESS', id);
  return true;
};
