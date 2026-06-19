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
  // If not configured, or if any error occurs compiling or executing, use localStorage
  if (!isSupabaseConfigured) {
    const saved = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(defaultHelpdeskButtons));
      return defaultHelpdeskButtons;
    }
    return JSON.parse(saved);
  }

  try {
    // Try querying the helpdesk_buttons table
    const { data, error } = await supabase
      .from('helpdesk_buttons')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      // Graceful fallback to localStorage if table doesn't exist
      console.warn('Supabase helpdesk_buttons table not found (or access error), falling back to localStorage:', error.message);
      const saved = localStorage.getItem(MOCK_STORAGE_KEY);
      if (!saved) {
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(defaultHelpdeskButtons));
        return defaultHelpdeskButtons;
      }
      return JSON.parse(saved);
    }

    if (!data || data.length === 0) {
      // If table is empty, insert default buttons
      const { error: insertError } = await supabase
        .from('helpdesk_buttons')
        .insert(defaultHelpdeskButtons);

      if (insertError) {
        console.error('Failed to insert default helpdesk buttons to Supabase:', insertError.message);
        return defaultHelpdeskButtons;
      }
      return defaultHelpdeskButtons;
    }

    return data as HelpdeskButton[];
  } catch (err) {
    console.error('Error fetching helpdesk buttons, using fallback:', err);
    const saved = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(defaultHelpdeskButtons));
      return defaultHelpdeskButtons;
    }
    return JSON.parse(saved);
  }
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

  try {
    const { error } = await supabase
      .from('helpdesk_buttons')
      .upsert(newButton);

    if (error) {
      throw error;
    }
    return newButton;
  } catch (err: any) {
    console.warn('Failed to upsert to Supabase helpdesk_buttons, saving to localStorage instead:', err.message);
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
};

export const deleteHelpdeskButton = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    const current = await getHelpdeskButtons();
    const filtered = current.filter(b => b.id !== id);
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }

  try {
    const { error } = await supabase
      .from('helpdesk_buttons')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
    return true;
  } catch (err: any) {
    console.warn('Failed to delete from Supabase helpdesk_buttons, deleting from localStorage instead:', err.message);
    const current = await getHelpdeskButtons();
    const filtered = current.filter(b => b.id !== id);
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }
};
