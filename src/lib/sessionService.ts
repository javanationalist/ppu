import { supabase, isSupabaseConfigured } from './supabase';

export interface SessionCheckResult {
  allowed: boolean;
  reason?: 'active_on_other_device' | 'not_found';
  profile?: any;
  countdownMinutes?: number;
}

// OS / Device detection without browser name (as requested)
export function getOSName(): string {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android Device';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad|iPod/.test(ua) && !(window as any).MSStream) return 'iPad/iOS Device';
  if (/mac/i.test(ua)) return 'macOS Device';
  if (/win/i.test(ua)) return 'Windows PC';
  if (/linux/i.test(ua)) return 'Linux Device';
  return 'Perangkat Desktop';
}

const SESSION_TIMEOUT_MS = 60 * 1000; // 1 minute auto release timeout for vote role

/**
 * Checks if a profile has an active session from another device.
 * For 'vote' role: Active if voting_status is not 'offline' and heartbeat has not timed out (within 1 minute).
 */
export async function checkSessionActive(
  userId: string,
  localToken: string | null
): Promise<SessionCheckResult> {
  let profile: any = null;

  if (!isSupabaseConfigured) {
    const localProfilesStr = localStorage.getItem('mock_profiles') || '[]';
    const profiles = JSON.parse(localProfilesStr);
    profile = profiles.find((p: any) => p.id === userId);
  } else {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (!error && data) {
        profile = data;
      }
    } catch (err) {
      console.error('Error fetching profile in session check:', err);
    }
  }

  if (!profile) {
    return { allowed: false, reason: 'not_found' };
  }

  const role = profile.role;

  if (role === 'vote') {
    const dbToken = profile.session_token;
    // Active if voting_status is NOT 'offline'
    if (profile.voting_status && profile.voting_status !== 'offline') {
      if (localToken && dbToken === localToken) {
        return { allowed: true, profile };
      }

      // Check heartbeat timeout
      const lastSeenStr = profile.last_seen;
      if (lastSeenStr) {
        const lastSeenTime = new Date(lastSeenStr).getTime();
        const elapsed = Date.now() - lastSeenTime;
        if (elapsed >= SESSION_TIMEOUT_MS) {
          // More than 1 minute without heartbeat, session automatically timed out!
          return { allowed: true, profile };
        }
      }

      return {
        allowed: false,
        reason: 'active_on_other_device',
        profile,
      };
    }
  }

  return { allowed: true, profile };
}

/**
 * Attempts to register/acquire a session lock for a user.
 * Succeeds if no other active session exists.
 */
export async function registerSession(
  userId: string,
  role: string
): Promise<{ success: boolean; token: string; existingProfile?: any }> {
  // If role is not vote, skip session locks
  if (role !== 'vote') {
    const defaultToken = 'sess_unlocked';
    localStorage.setItem('current_session_token', defaultToken);
    return { success: true, token: defaultToken };
  }

  // Generate a new unique session token
  const newToken = 'sess_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
  const deviceName = getOSName();
  const nowStr = new Date().toISOString();

  // First, check if there is an active session
  // We pass null for local token to see if ANY active session exists
  const check = await checkSessionActive(userId, null);

  if (!check.allowed) {
    // Session is active on another device! Reject registration.
    return {
      success: false,
      token: '',
      existingProfile: check.profile,
    };
  }

  // Update in DB/mock
  if (!isSupabaseConfigured) {
    const localProfilesStr = localStorage.getItem('mock_profiles') || '[]';
    const profiles = JSON.parse(localProfilesStr);
    const updated = profiles.map((p: any) => {
      if (p.id === userId) {
        return {
          ...p,
          session_token: newToken,
          last_seen: nowStr,
          device_name: deviceName,
          voting_status: 'waiting',
        };
      }
      return p;
    });
    localStorage.setItem('mock_profiles', JSON.stringify(updated));
  } else {
    try {
      const updatePayload: any = {
        session_token: newToken,
        last_seen: nowStr,
        device_name: deviceName,
        voting_status: 'waiting',
      };

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId);

      if (error) {
        console.error('Error saving session registration in Supabase:', error);
        return { success: false, token: '' };
      }
    } catch (err) {
      console.error('Exception during session registration:', err);
      return { success: false, token: '' };
    }
  }

  // Store in local storage of this browser
  localStorage.setItem('current_session_token', newToken);

  return { success: true, token: newToken };
}

/**
 * Periodically updates the last_seen timestamp in the DB for active 'vote' role sessions.
 */
export async function updateLastSeen(userId: string, token: string): Promise<void> {
  const nowStr = new Date().toISOString();

  if (!isSupabaseConfigured) {
    const localProfilesStr = localStorage.getItem('mock_profiles') || '[]';
    const profiles = JSON.parse(localProfilesStr);
    const updated = profiles.map((p: any) => {
      if (p.id === userId && p.session_token === token) {
        return { ...p, last_seen: nowStr };
      }
      return p;
    });
    localStorage.setItem('mock_profiles', JSON.stringify(updated));
  } else {
    try {
      // Only update if the session token in the database matches our current local session token!
      await supabase
        .from('profiles')
        .update({ last_seen: nowStr })
        .eq('id', userId)
        .eq('session_token', token);
    } catch (err) {
      console.error('Failed to update last_seen:', err);
    }
  }
}

/**
 * Clears the session on logout or session deactivation.
 */
export async function clearSessionInDb(userId: string, token: string, role: string): Promise<void> {
  if (role !== 'vote') {
    localStorage.removeItem('current_session_token');
    return;
  }

  if (!isSupabaseConfigured) {
    const localProfilesStr = localStorage.getItem('mock_profiles') || '[]';
    const profiles = JSON.parse(localProfilesStr);
    const updated = profiles.map((p: any) => {
      if (p.id === userId && p.session_token === token) {
        return {
          ...p,
          session_token: null,
          last_seen: null,
          device_name: null,
          voting_status: 'offline',
        };
      }
      return p;
    });
    localStorage.setItem('mock_profiles', JSON.stringify(updated));
  } else {
    try {
      await supabase
        .from('profiles')
        .update({
          session_token: null,
          last_seen: null,
          device_name: null,
          voting_status: 'offline',
        })
        .eq('id', userId)
        .eq('session_token', token);
    } catch (err) {
      console.error('Failed to clear session in DB:', err);
    }
  }

  localStorage.removeItem('current_session_token');
}
