import { supabase, isSupabaseConfigured } from './supabase';

export type VoteMode = 'regular' | 'booth';

const MODE_STORAGE_KEY = 'ppu_vote_mode';
const SESSION_STORAGE_KEY_PREFIX = 'ppu_booth_session_';

export interface BoothSession {
  id: string;
  status: 'waiting' | 'connected' | 'completed' | 'cancelled';
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  document_serial: string | null;
  card_id: string | null;
  created_at?: string;
}

// Extract a consistent 2-digit "CC" booth code from the profile name, keterangan/class, or email, with hash-based fallback
export function getBoothCode(profile: any): string {
  if (!profile) return '01';
  
  // 0. Use explicit booth_code field if available
  if (profile.booth_code) {
    const cleanCode = profile.booth_code.trim().toUpperCase();
    if (/^\d+$/.test(cleanCode)) {
      return cleanCode.padStart(2, '0');
    }
    return cleanCode;
  }
  
  // 1. Try to find digits in full_name (e.g. "Bilik 01" -> "01", "Bilik 1" -> "01")
  if (profile.full_name) {
    const match = profile.full_name.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      return num.toString().padStart(2, '0');
    }
  }

  // 2. Try to find digits in class / keterangan (e.g. "01")
  if (profile.class) {
    const match = profile.class.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      return num.toString().padStart(2, '0');
    }
  }

  // 3. Try to find digits in email (e.g. "bilik01@ppu.com" -> "01")
  if (profile.email) {
    const match = profile.email.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      return num.toString().padStart(2, '0');
    }
  }

  // 4. Stable fallback using profile.id hashing
  let hash = 0;
  const idStr = profile.id || '01';
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const codeNum = Math.abs(hash % 99) + 1; // 1 to 99
  return codeNum.toString().padStart(2, '0');
}

// Retrieve a booth profile based on its derived CC code
export const getBoothProfileByCode = async (cc: string): Promise<any | null> => {
  if (!isSupabaseConfigured) {
    try {
      const localProfilesStr = localStorage.getItem('mock_profiles') || '[]';
      const profiles = JSON.parse(localProfilesStr);
      return profiles.find((p: any) => p.role === 'vote' && !p.is_deleted && getBoothCode(p) === cc) || null;
    } catch (e) {
      return null;
    }
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'vote')
      .eq('is_deleted', false);
    
    if (error || !data) return null;

    return data.find((p: any) => getBoothCode(p) === cc) || null;
  } catch (err) {
    console.error('Error getting booth profile by code:', err);
    return null;
  }
};

// ----------------------------------------------------
// VOTE MODE CONFIGURATIONS
// ----------------------------------------------------

export const getVoteMode = async (): Promise<VoteMode> => {
  const saved = localStorage.getItem(MODE_STORAGE_KEY);
  const defaultMode: VoteMode = (saved as VoteMode) === 'booth' ? 'booth' : 'regular';

  if (!isSupabaseConfigured) {
    return defaultMode;
  }

  try {
    const { data, error } = await supabase
      .from('vote_mode')
      .select('*')
      .eq('id', 'current')
      .maybeSingle();

    if (error || !data) {
      // Seed table with default if it doesn't exist
      if (!data) {
        try {
          await supabase.from('vote_mode').upsert({ id: 'current', mode: defaultMode });
        } catch (seedErr) {
          console.warn('Silent seeding warning:', seedErr);
        }
      }
      return defaultMode;
    }

    return (data.mode === 'booth') ? 'booth' : 'regular';
  } catch (err) {
    console.error('Error fetching vote mode, falling back to local storage:', err);
    return defaultMode;
  }
};

export const saveVoteMode = async (mode: VoteMode): Promise<boolean> => {
  localStorage.setItem(MODE_STORAGE_KEY, mode);

  if (!isSupabaseConfigured) {
    return true;
  }

  try {
    const { error } = await supabase
      .from('vote_mode')
      .upsert({
        id: 'current',
        mode: mode,
      });

    if (error) {
      console.warn('Failed to upsert to Supabase vote_mode:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving vote mode to Supabase:', err);
    return false;
  }
};

// ----------------------------------------------------
// BILIK SUARA / BOOTH SESSIONS
// ----------------------------------------------------

export const createBoothSession = async (sessionId: string): Promise<BoothSession> => {
  const sessionData: BoothSession = {
    id: sessionId,
    status: 'waiting',
    user_id: null,
    full_name: null,
    email: null,
    document_serial: null,
    card_id: null,
  };

  localStorage.setItem(`${SESSION_STORAGE_KEY_PREFIX}${sessionId}`, JSON.stringify(sessionData));

  // Invalidate previous local sessions for this booth (same CC)
  const parts = sessionId.split('-');
  if (parts.length === 3) {
    const cc = parts[1];
    const prefixToCancel = `PPU-${cc}-`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SESSION_STORAGE_KEY_PREFIX)) {
        const sid = key.substring(SESSION_STORAGE_KEY_PREFIX.length);
        if (sid.startsWith(prefixToCancel) && sid !== sessionId) {
          try {
            const sDataStr = localStorage.getItem(key);
            if (sDataStr) {
              const sData = JSON.parse(sDataStr);
              if (sData.status === 'waiting' || sData.status === 'connected') {
                sData.status = 'cancelled';
                localStorage.setItem(key, JSON.stringify(sData));
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }
  }

  if (!isSupabaseConfigured) {
    return sessionData;
  }

  try {
    // Invalidate in Supabase: status of any other session for this booth (starting with PPU-CC-)
    if (parts.length === 3) {
      const cc = parts[1];
      const prefixToCancel = `PPU-${cc}-%`;
      await supabase
        .from('booth_sessions')
        .update({ status: 'cancelled' })
        .like('id', prefixToCancel)
        .neq('id', sessionId)
        .in('status', ['waiting', 'connected']);
    }

    const { error } = await supabase
      .from('booth_sessions')
      .insert(sessionData);

    if (error) {
      console.warn('Failed to insert booth session to Supabase, using localStorage:', error.message);
    }
  } catch (err) {
    console.error('Error creating booth session in Supabase:', err);
  }

  return sessionData;
};

export const getBoothSession = async (sessionId: string): Promise<BoothSession | null> => {
  // Try local first
  const localStr = localStorage.getItem(`${SESSION_STORAGE_KEY_PREFIX}${sessionId}`);
  const localData: BoothSession | null = localStr ? JSON.parse(localStr) : null;

  if (!isSupabaseConfigured) {
    return localData;
  }

  try {
    const { data, error } = await supabase
      .from('booth_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) {
      return localData;
    }

    if (data) {
      // Sync local storage with latest data
      localStorage.setItem(`${SESSION_STORAGE_KEY_PREFIX}${sessionId}`, JSON.stringify(data));
      return data as BoothSession;
    }

    return null;
  } catch (err) {
    console.error('Error getting booth session from Supabase:', err);
    return localData;
  }
};

export const getActiveBoothSessionForCC = async (cc: string): Promise<BoothSession | null> => {
  if (!isSupabaseConfigured) {
    // Check localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SESSION_STORAGE_KEY_PREFIX)) {
        const sid = key.substring(SESSION_STORAGE_KEY_PREFIX.length);
        if (sid.startsWith(`PPU-${cc}-`)) {
          try {
            const sDataStr = localStorage.getItem(key);
            if (sDataStr) {
              const sData = JSON.parse(sDataStr) as BoothSession;
              if (sData.status === 'waiting' || sData.status === 'connected') {
                return sData;
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('booth_sessions')
      .select('*')
      .like('id', `PPU-${cc}-%`)
      .in('status', ['waiting', 'connected'])
      .order('id', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }
    
    // Cache to local storage
    const latest = data[0] as BoothSession;
    localStorage.setItem(`${SESSION_STORAGE_KEY_PREFIX}${latest.id}`, JSON.stringify(latest));
    return latest;
  } catch (err) {
    console.error('Error fetching active session by CC:', err);
    return null;
  }
};

export const connectVoterToBooth = async (
  sessionId: string,
  voterInfo: Omit<BoothSession, 'id' | 'status'>
): Promise<boolean> => {
  // Check latest status first (local storage fallback or Supabase)
  const latest = await getBoothSession(sessionId);
  if (!latest) {
    console.warn(`Booth session ${sessionId} not found`);
    return false;
  }

  if (latest.status !== 'waiting') {
    console.warn(`Booth session ${sessionId} is already ${latest.status}`);
    return false;
  }

  const sessionData: BoothSession = {
    id: sessionId,
    status: 'connected',
    ...voterInfo,
  };

  if (!isSupabaseConfigured) {
    localStorage.setItem(`${SESSION_STORAGE_KEY_PREFIX}${sessionId}`, JSON.stringify(sessionData));
    return true;
  }

  try {
    const { data, error } = await supabase
      .from('booth_sessions')
      .update({
        status: 'connected',
        user_id: voterInfo.user_id,
        full_name: voterInfo.full_name,
        email: voterInfo.email,
        document_serial: voterInfo.document_serial,
        card_id: voterInfo.card_id
      })
      .eq('id', sessionId)
      .eq('status', 'waiting')
      .select();

    if (error || !data || data.length === 0) {
      console.warn('Failed to connect voter or session already claimed/cancelled:', error?.message);
      return false;
    }

    localStorage.setItem(`${SESSION_STORAGE_KEY_PREFIX}${sessionId}`, JSON.stringify(data[0]));
    return true;
  } catch (err) {
    console.error('Error connecting voter to booth in Supabase:', err);
    return false;
  }
};

export const completeBoothSession = async (sessionId: string): Promise<boolean> => {
  const sessionDataStr = localStorage.getItem(`${SESSION_STORAGE_KEY_PREFIX}${sessionId}`);
  if (sessionDataStr) {
    const data = JSON.parse(sessionDataStr) as BoothSession;
    data.status = 'completed';
    localStorage.setItem(`${SESSION_STORAGE_KEY_PREFIX}${sessionId}`, JSON.stringify(data));
  }

  if (!isSupabaseConfigured) {
    return true;
  }

  try {
    const { error } = await supabase
      .from('booth_sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId);

    if (error) {
      console.warn('Failed to complete session in Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error completing booth session in Supabase:', err);
    return false;
  }
};

export const cancelBoothSession = async (sessionId: string): Promise<boolean> => {
  const sessionDataStr = localStorage.getItem(`${SESSION_STORAGE_KEY_PREFIX}${sessionId}`);
  if (sessionDataStr) {
    const data = JSON.parse(sessionDataStr) as BoothSession;
    data.status = 'cancelled';
    data.user_id = null;
    data.full_name = null;
    data.email = null;
    data.document_serial = null;
    data.card_id = null;
    localStorage.setItem(`${SESSION_STORAGE_KEY_PREFIX}${sessionId}`, JSON.stringify(data));
  }

  if (!isSupabaseConfigured) {
    return true;
  }

  try {
    const { error } = await supabase
      .from('booth_sessions')
      .update({
        status: 'cancelled',
        user_id: null,
        full_name: null,
        email: null,
        document_serial: null,
        card_id: null
      })
      .eq('id', sessionId);

    if (error) {
      console.warn('Failed to cancel session in Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error cancelling booth session in Supabase:', err);
    return false;
  }
};

export const updateBoothStatus = async (
  boothId: string,
  status: 'waiting' | 'connected' | 'voting' | 'offline'
): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    try {
      const localProfilesStr = localStorage.getItem('mock_profiles') || '[]';
      const profiles = JSON.parse(localProfilesStr);
      const updated = profiles.map((p: any) => {
        if (p.id === boothId) {
          return { ...p, voting_status: status };
        }
        return p;
      });
      localStorage.setItem('mock_profiles', JSON.stringify(updated));
      return true;
    } catch (err) {
      console.error('Error updating mock booth status:', err);
      return false;
    }
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ voting_status: status })
      .eq('id', boothId);

    if (error) {
      console.warn('Failed to update booth status in Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error updating booth status in Supabase:', err);
    return false;
  }
};

export const getBoothProfile = async (boothId: string): Promise<any | null> => {
  if (!isSupabaseConfigured) {
    try {
      const localProfilesStr = localStorage.getItem('mock_profiles') || '[]';
      const profiles = JSON.parse(localProfilesStr);
      return profiles.find((p: any) => p.id === boothId && p.role === 'vote') || null;
    } catch (e) {
      return null;
    }
  }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', boothId)
      .eq('role', 'vote')
      .maybeSingle();
    if (error) return null;
    return data;
  } catch (err) {
    console.error('Error getting booth profile:', err);
    return null;
  }
};

