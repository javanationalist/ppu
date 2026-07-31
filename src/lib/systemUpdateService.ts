import { supabase } from './supabase';
import { SystemUpdate } from '../types';

const LOCAL_STORAGE_KEY = 'mock_system_updates';

const defaultUpdates: SystemUpdate[] = [
  {
    id: 'update-2.1.0',
    version: 'Versi 2.1.0',
    date: '31 Juli 2026',
    content: '• Tampilan Dashboard User diperbarui.\n• Header baru.\n• Sistem Status diperbaiki.\n• Performa Scan QR ditingkatkan.',
    created_at: '2026-07-31T00:00:00.000Z',
  },
  {
    id: 'update-2.0.5',
    version: 'Versi 2.0.5',
    date: '25 Juli 2026',
    content: '• Perbaikan bug voting.\n• Optimasi realtime.',
    created_at: '2026-07-25T00:00:00.000Z',
  },
];

function getLocalUpdates(): SystemUpdate[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultUpdates));
      return defaultUpdates;
    }
    return JSON.parse(raw);
  } catch (e) {
    return defaultUpdates;
  }
}

function setLocalUpdates(updates: SystemUpdate[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updates));
  } catch (e) {
    console.error('Failed to save system updates to localStorage', e);
  }
}

export async function getSystemUpdates(): Promise<SystemUpdate[]> {
  try {
    const { data, error } = await supabase
      .from('system_updates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      // If table doesn't exist or empty, check local storage
      const local = getLocalUpdates();
      if (error && error.code === '42P01') {
        // Table doesn't exist, use local
        return local;
      }
      if (data && data.length === 0 && local.length > 0) {
        return local;
      }
      return data || local;
    }

    return data;
  } catch (err) {
    console.warn('Error fetching system updates from Supabase, using local fallback', err);
    return getLocalUpdates();
  }
}

export async function createSystemUpdate(payload: { version: string; date: string; content: string }): Promise<SystemUpdate> {
  const newUpdate: SystemUpdate = {
    id: `update-${Date.now()}`,
    version: payload.version,
    date: payload.date,
    content: payload.content,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('system_updates')
      .insert([{
        version: payload.version,
        date: payload.date,
        content: payload.content,
      }])
      .select()
      .single();

    if (!error && data) {
      return data;
    }
  } catch (e) {
    console.warn('Supabase insert system_updates failed, using fallback', e);
  }

  // Local fallback
  const local = getLocalUpdates();
  const updatedList = [newUpdate, ...local];
  setLocalUpdates(updatedList);
  return newUpdate;
}

export async function updateSystemUpdate(
  id: string,
  payload: { version: string; date: string; content: string }
): Promise<void> {
  try {
    const { error } = await supabase
      .from('system_updates')
      .update({
        version: payload.version,
        date: payload.date,
        content: payload.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.warn('Supabase update system_updates error', error);
    }
  } catch (e) {
    console.warn('Supabase update system_updates exception', e);
  }

  // Local fallback
  const local = getLocalUpdates();
  const index = local.findIndex((u) => u.id === id);
  if (index !== -1) {
    local[index] = {
      ...local[index],
      version: payload.version,
      date: payload.date,
      content: payload.content,
      updated_at: new Date().toISOString(),
    };
    setLocalUpdates(local);
  }
}

export async function deleteSystemUpdate(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('system_updates')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Supabase delete system_updates error', error);
    }
  } catch (e) {
    console.warn('Supabase delete system_updates exception', e);
  }

  // Local fallback
  const local = getLocalUpdates();
  const filtered = local.filter((u) => u.id !== id);
  setLocalUpdates(filtered);
}
