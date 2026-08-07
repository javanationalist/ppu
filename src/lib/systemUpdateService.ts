import { supabase, isSupabaseConfigured } from './supabase';
import { SystemUpdate } from '../types';

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

export async function getSystemUpdates(): Promise<SystemUpdate[]> {
  if (!isSupabaseConfigured) {
    return defaultUpdates;
  }

  const { data, error } = await supabase
    .from('system_updates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    if (import.meta.env.DEV) console.error('[DB] GET system_updates ERROR:', error);
    if (error.code === '42P01') {
      console.warn('[DB] Table system_updates missing in Supabase. Returning default fallback.');
      return defaultUpdates;
    }
    throw new Error(`Gagal mengambil data update sistem: ${error.message}`);
  }

  if (import.meta.env.DEV) console.log('[DB] GET system_updates SUCCESS', data?.length);
  return data || [];
}

export async function createSystemUpdate(payload: { version: string; date: string; content: string }): Promise<SystemUpdate> {
  if (!isSupabaseConfigured) {
    return {
      id: `update-${Date.now()}`,
      version: payload.version,
      date: payload.date,
      content: payload.content,
      created_at: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from('system_updates')
    .insert([{
      version: payload.version,
      date: payload.date,
      content: payload.content,
    }])
    .select()
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error('[DB] INSERT system_updates ERROR:', error);
    throw new Error(`Gagal menyimpan update sistem: ${error.message}`);
  }

  if (import.meta.env.DEV) console.log('[DB] INSERT system_updates SUCCESS', data.id);
  return data;
}

export async function updateSystemUpdate(
  id: string,
  payload: { version: string; date: string; content: string }
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

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
    if (import.meta.env.DEV) console.error('[DB] UPDATE system_updates ERROR:', error);
    throw new Error(`Gagal memperbarui update sistem: ${error.message}`);
  }

  if (import.meta.env.DEV) console.log('[DB] UPDATE system_updates SUCCESS', id);
}

export async function deleteSystemUpdate(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const { error } = await supabase
    .from('system_updates')
    .delete()
    .eq('id', id);

  if (error) {
    if (import.meta.env.DEV) console.error('[DB] DELETE system_updates ERROR:', error);
    throw new Error(`Gagal menghapus update sistem: ${error.message}`);
  }

  if (import.meta.env.DEV) console.log('[DB] DELETE system_updates SUCCESS', id);
}

