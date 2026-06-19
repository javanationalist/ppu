import { supabase } from './supabase';
import { Profile, AuditLog } from '../types';

// Helper to log admin actions
export const logAdminAction = async (
  adminEmail: string,
  action: string,
  targetUser: string
): Promise<void> => {
  try {
    const newLog = {
      admin_email: adminEmail,
      action,
      target_user: targetUser,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('audit_logs').insert(newLog);

    if (error) {
      // localStorage Fallback
      const localLogsStr = localStorage.getItem('mock_audit_logs') || '[]';
      const localLogs = JSON.parse(localLogsStr);
      localLogs.push({
        id: 'log-' + Math.random().toString(36).substring(2, 11),
        ...newLog
      });
      localStorage.setItem('mock_audit_logs', JSON.stringify(localLogs));
    }
  } catch (err) {
    console.error('Failed to log admin action:', err);
  }
};

// Fetch audit logs
export const getAuditLogs = async (): Promise<AuditLog[]> => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      const localLogsStr = localStorage.getItem('mock_audit_logs') || '[]';
      const logs: AuditLog[] = JSON.parse(localLogsStr);
      logs.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
      return logs;
    }

    return data as AuditLog[];
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return [];
  }
};

// Fetch all profiles (voters/admins)
export const getAllProfiles = async (): Promise<Profile[]> => {
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error || !data) {
      const localProfilesStr = localStorage.getItem('mock_profiles') || '[]';
      return JSON.parse(localProfilesStr) as Profile[];
    }
    return data as Profile[];
  } catch (err) {
    console.error('Error fetching profiles:', err);
    return [];
  }
};

// Confirm user account status
export const confirmVoterAccount = async (
  adminEmail: string,
  voterId: string,
  voterName: string,
  cardId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        account_status: 'dikonfirmasi'
      })
      .eq('id', voterId);

    if (error) {
      console.error('Supabase Error confirming voter:', error);
      // Local fallback for offline-testing, but inform the UI it might not be permanent if DB failed
      const localProfilesStr = localStorage.getItem('mock_profiles');
      if (localProfilesStr) {
        const profiles: Profile[] = JSON.parse(localProfilesStr);
        const idx = profiles.findIndex(p => p.id === voterId);
        if (idx >= 0) {
          profiles[idx].account_status = 'dikonfirmasi';
          localStorage.setItem('mock_profiles', JSON.stringify(profiles));
        }
      }
      return false; // Return false to indicate DB persistence failed
    }

    await logAdminAction(
      adminEmail,
      'Admin confirmed voter',
      `${voterName} (Card ID: ${cardId})`
    );
    return true;
  } catch (err) {
    console.error('Failed to confirm voter:', err);
    return false;
  }
};

// Reset confirmation status
export const resetVoterConfirmation = async (
  adminEmail: string,
  voterId: string,
  voterName: string,
  cardId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        account_status: 'belum_dikonfirmasi'
      })
      .eq('id', voterId);

    if (error) {
      const localProfilesStr = localStorage.getItem('mock_profiles');
      if (localProfilesStr) {
        const profiles: Profile[] = JSON.parse(localProfilesStr);
        const idx = profiles.findIndex(p => p.id === voterId);
        if (idx >= 0) {
          profiles[idx].account_status = 'belum_dikonfirmasi';
          localStorage.setItem('mock_profiles', JSON.stringify(profiles));
        }
      }
      return false;
    }

    await logAdminAction(
      adminEmail,
      'Admin reset confirmation',
      `${voterName} (Card ID: ${cardId})`
    );
    return true;
  } catch (err) {
    console.error('Failed to reset voter confirmation:', err);
    return false;
  }
};

// Reset voter history and votes
export const resetVoterHistory = async (
  adminEmail: string,
  voterId: string,
  voterName: string,
  cardId: string
): Promise<boolean> => {
  try {
    // Delete recorded votes belonging to that voter
    const { error: deleteError } = await supabase
      .from('votes')
      .delete()
      .eq('voter_id', voterId);

    // Delete matching votes from localStorage in any case to keep fallback synced
    const localVotesStr = localStorage.getItem('mock_votes');
    if (localVotesStr) {
      const votes = JSON.parse(localVotesStr);
      const remainingVotes = votes.filter((v: any) => v.voter_id !== voterId);
      localStorage.setItem('mock_votes', JSON.stringify(remainingVotes));
    }

    // Reset voting_status to "belum"
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: voterId,
        voting_status: 'belum'
      });

    if (profileError) {
      const localProfilesStr = localStorage.getItem('mock_profiles');
      if (localProfilesStr) {
        const profiles: Profile[] = JSON.parse(localProfilesStr);
        const idx = profiles.findIndex(p => p.id === voterId);
        if (idx >= 0) {
          profiles[idx].voting_status = 'belum';
          localStorage.setItem('mock_profiles', JSON.stringify(profiles));
        }
      }
    }

    await logAdminAction(
      adminEmail,
      'Admin reset voting history',
      `${voterName} (Card ID: ${cardId})`
    );
    return true;
  } catch (err) {
    console.error('Failed to reset voting history:', err);
    return false;
  }
};

// Soft delete account
export const softDeleteVoter = async (
  adminEmail: string,
  voterId: string,
  voterName: string,
  cardId: string
): Promise<boolean> => {
  try {
    const deletionTime = new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: voterId,
        is_deleted: true,
        deleted_at: deletionTime
      });

    if (error) {
      const localProfilesStr = localStorage.getItem('mock_profiles');
      if (localProfilesStr) {
        const profiles: Profile[] = JSON.parse(localProfilesStr);
        const idx = profiles.findIndex(p => p.id === voterId);
        if (idx >= 0) {
          profiles[idx].is_deleted = true;
          profiles[idx].deleted_at = deletionTime;
          localStorage.setItem('mock_profiles', JSON.stringify(profiles));
        }
      }
    }

    await logAdminAction(
      adminEmail,
      'Admin deleted account',
      `${voterName} (Card ID: ${cardId})`
    );
    return true;
  } catch (err) {
    console.error('Failed to delete voter account:', err);
    return false;
  }
};

// Restore account
export const restoreVoter = async (
  adminEmail: string,
  voterId: string,
  voterName: string,
  cardId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: voterId,
        is_deleted: false,
        deleted_at: null
      });

    if (error) {
      const localProfilesStr = localStorage.getItem('mock_profiles');
      if (localProfilesStr) {
        const profiles: Profile[] = JSON.parse(localProfilesStr);
        const idx = profiles.findIndex(p => p.id === voterId);
        if (idx >= 0) {
          profiles[idx].is_deleted = false;
          profiles[idx].deleted_at = null;
          localStorage.setItem('mock_profiles', JSON.stringify(profiles));
        }
      }
    }

    await logAdminAction(
      adminEmail,
      'Admin restored account',
      `${voterName} (Card ID: ${cardId})`
    );
    return true;
  } catch (err) {
    console.error('Failed to restore voter account:', err);
    return false;
  }
};
