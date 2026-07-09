import { supabase, isSupabaseConfigured } from './supabase';
import { createClient } from '@supabase/supabase-js';
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
          
          await logAdminAction(
            adminEmail,
            'Admin confirmed voter (Local Fallback)',
            `${voterName} (Card ID: ${cardId})`
          );
          return true; // Return true as local fallback succeeded
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
      console.error('Supabase Error resetting voter confirmation:', error);
      const localProfilesStr = localStorage.getItem('mock_profiles');
      if (localProfilesStr) {
        const profiles: Profile[] = JSON.parse(localProfilesStr);
        const idx = profiles.findIndex(p => p.id === voterId);
        if (idx >= 0) {
          profiles[idx].account_status = 'belum_dikonfirmasi';
          localStorage.setItem('mock_profiles', JSON.stringify(profiles));
          
          await logAdminAction(
            adminEmail,
            'Admin reset confirmation (Local Fallback)',
            `${voterName} (Card ID: ${cardId})`
          );
          return true; // Return true as local fallback succeeded
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

// Reset confirmation status for ALL voters
export const resetAllVotersConfirmation = async (
  adminEmail: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        account_status: 'belum_dikonfirmasi'
      })
      .eq('role', 'user');

    // Also update mock profiles in localStorage
    const localProfilesStr = localStorage.getItem('mock_profiles');
    let localSucceeded = false;
    if (localProfilesStr) {
      const profiles: Profile[] = JSON.parse(localProfilesStr);
      const updated = profiles.map(p => {
        if (p.role === 'user') {
          return { ...p, account_status: 'belum_dikonfirmasi' as const };
        }
        return p;
      });
      localStorage.setItem('mock_profiles', JSON.stringify(updated));
      localSucceeded = true;
    }

    if (error) {
      console.error('Database error in resetAllVotersConfirmation:', error);
      if (localSucceeded) {
        await logAdminAction(
          adminEmail,
          'Admin reset all voter confirmations (Local Fallback)',
          'Seluruh status konfirmasi akun di-reset ke Belum Dikonfirmasi'
        );
        return true; // Return true as local fallback succeeded
      }
      return false;
    }

    await logAdminAction(
      adminEmail,
      'Admin reset all voter confirmations',
      'Seluruh status konfirmasi akun di-reset ke Belum Dikonfirmasi'
    );
    return true;
  } catch (err) {
    console.error('Failed to reset all voter confirmations:', err);
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

// CREATE BOOTH
export const createBooth = async (
  adminEmail: string,
  name: string,
  keterangan: string,
  email: string,
  password: string,
  boothCode: string
): Promise<{ success: boolean; error?: string }> => {
  // Validate unique email in profiles first
  try {
    const existing = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
    if (existing && existing.data) {
      return { success: false, error: 'Email login sudah digunakan.' };
    }
  } catch (e) {
    // Ignore and proceed
  }

  // Validate unique booth code
  try {
    const existingCode = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'vote')
      .eq('is_deleted', false)
      .eq('booth_code', boothCode)
      .maybeSingle();
    if (existingCode && existingCode.data) {
      return { success: false, error: `Kode Bilik "${boothCode}" sudah digunakan.` };
    }
  } catch (e) {
    // Ignore and proceed
  }

  const uniqueCardId = 'booth-' + Math.random().toString(36).substring(2, 11);

  if (!isSupabaseConfigured) {
    const localProfilesStr = localStorage.getItem('mock_profiles') || '[]';
    const profiles = JSON.parse(localProfilesStr);
    
    const localUsersStr = localStorage.getItem('mock_users') || '[]';
    const users = JSON.parse(localUsersStr);

    if (users.find((u: any) => u.email === email)) {
      return { success: false, error: 'Email login sudah digunakan.' };
    }

    const codeConflict = profiles.find(
      (p: any) => p.role === 'vote' && !p.is_deleted && p.booth_code?.toUpperCase() === boothCode.toUpperCase()
    );
    if (codeConflict) {
      return { success: false, error: `Kode Bilik "${boothCode}" sudah digunakan.` };
    }

    const newUserId = 'usr-' + Math.random().toString(36).substring(2, 11);
    users.push({ id: newUserId, email, password });
    localStorage.setItem('mock_users', JSON.stringify(users));

    const newProfile: Profile = {
      id: newUserId,
      full_name: name,
      email: email,
      role: 'vote',
      account_status: 'dikonfirmasi',
      voting_status: 'offline',
      class: keterangan,
      card_id: uniqueCardId,
      created_at: new Date().toISOString(),
      is_deleted: false,
      booth_code: boothCode,
    };

    profiles.push(newProfile);
    localStorage.setItem('mock_profiles', JSON.stringify(profiles));

    await logAdminAction(adminEmail, 'Membuat Bilik Suara baru (Mock)', `${name} (${email})`);
    return { success: true };
  }

  try {
    const tempClient = createClient(
      import.meta.env.VITE_SUPABASE_URL || '',
      import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      { auth: { persistSession: false } }
    );

    const { data: authData, error: authError } = await tempClient.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          full_name: name,
          email: email,
          role: 'vote',
          account_status: 'dikonfirmasi',
          voting_status: 'offline',
          class: keterangan,
          card_id: uniqueCardId,
          is_deleted: false,
          booth_code: boothCode,
        });

      if (profileError) {
        return { success: false, error: profileError.message };
      }

      await logAdminAction(adminEmail, 'Membuat Bilik Suara baru', `${name} (${email})`);
      return { success: true };
    }

    return { success: false, error: 'Gagal membuat akun Bilik Suara.' };
  } catch (err: any) {
    console.error(err);
    return { success: false, error: err.message || 'Terjadi kesalahan sistem.' };
  }
};

// UPDATE BOOTH
export const updateBooth = async (
  adminEmail: string,
  boothId: string,
  name: string,
  keterangan: string,
  boothCode: string
): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    const localProfilesStr = localStorage.getItem('mock_profiles');
    if (localProfilesStr) {
      const profiles = JSON.parse(localProfilesStr);
      
      const codeConflict = profiles.find(
        (p: any) => p.id !== boothId && p.role === 'vote' && !p.is_deleted && p.booth_code?.toUpperCase() === boothCode.toUpperCase()
      );
      if (codeConflict) {
        throw new Error(`Kode Bilik "${boothCode}" sudah digunakan.`);
      }

      const idx = profiles.findIndex((p: any) => p.id === boothId);
      if (idx >= 0) {
        const oldName = profiles[idx].full_name;
        profiles[idx].full_name = name;
        profiles[idx].class = keterangan;
        profiles[idx].booth_code = boothCode;
        localStorage.setItem('mock_profiles', JSON.stringify(profiles));
        await logAdminAction(adminEmail, 'Mengubah info Bilik Suara', `${oldName} -> ${name}`);
        return true;
      }
    }
    return false;
  }

  try {
    const { data: existingCode, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'vote')
      .eq('is_deleted', false)
      .eq('booth_code', boothCode)
      .neq('id', boothId)
      .maybeSingle();

    if (existingCode) {
      throw new Error(`Kode Bilik "${boothCode}" sudah digunakan.`);
    }

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name, class: keterangan, booth_code: boothCode })
      .eq('id', boothId);

    if (error) throw error;
    await logAdminAction(adminEmail, 'Mengubah info Bilik Suara', `ID: ${boothId}`);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

// RESET PASSWORD
export const resetBoothPassword = async (
  adminEmail: string,
  boothId: string,
  boothEmail: string,
  newPassword: string
): Promise<boolean> => {
  const localUsersStr = localStorage.getItem('mock_users') || '[]';
  const users = JSON.parse(localUsersStr);
  const idx = users.findIndex((u: any) => u.email === boothEmail || u.id === boothId);
  if (idx >= 0) {
    users[idx].password = newPassword;
  } else {
    users.push({ id: boothId, email: boothEmail, password: newPassword });
  }
  localStorage.setItem('mock_users', JSON.stringify(users));

  await logAdminAction(adminEmail, 'Mereset password Bilik Suara', boothEmail);
  return true;
};

// DELETE BOOTH
export const deleteBooth = async (
  adminEmail: string,
  boothId: string,
  boothName: string
): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    const localProfilesStr = localStorage.getItem('mock_profiles');
    if (localProfilesStr) {
      const profiles = JSON.parse(localProfilesStr);
      const remaining = profiles.filter((p: any) => p.id !== boothId);
      localStorage.setItem('mock_profiles', JSON.stringify(remaining));

      const localUsersStr = localStorage.getItem('mock_users');
      if (localUsersStr) {
        const users = JSON.parse(localUsersStr);
        const bProfile = profiles.find((p: any) => p.id === boothId);
        if (bProfile) {
          const remainingUsers = users.filter((u: any) => u.email !== bProfile.email);
          localStorage.setItem('mock_users', JSON.stringify(remainingUsers));
        }
      }

      await logAdminAction(adminEmail, 'Menghapus Bilik Suara (Mock)', boothName);
      return true;
    }
    return false;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', boothId);

    if (error) throw error;
    await logAdminAction(adminEmail, 'Menghapus Bilik Suara', boothName);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

// TOGGLE ACTIVATION (NONAKTIFKAN / AKTIFKAN)
export const toggleBoothActivation = async (
  adminEmail: string,
  boothId: string,
  boothName: string,
  currentlyActive: boolean
): Promise<boolean> => {
  const nextDeletedState = currentlyActive;
  if (!isSupabaseConfigured) {
    const localProfilesStr = localStorage.getItem('mock_profiles');
    if (localProfilesStr) {
      const profiles = JSON.parse(localProfilesStr);
      const idx = profiles.findIndex((p: any) => p.id === boothId);
      if (idx >= 0) {
        profiles[idx].is_deleted = nextDeletedState;
        if (nextDeletedState) {
          profiles[idx].voting_status = 'offline';
        }
        localStorage.setItem('mock_profiles', JSON.stringify(profiles));
        await logAdminAction(
          adminEmail,
          nextDeletedState ? 'Menonaktifkan Bilik Suara (Mock)' : 'Mengaktifkan Bilik Suara (Mock)',
          boothName
        );
        return true;
      }
    }
    return false;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        is_deleted: nextDeletedState,
        voting_status: nextDeletedState ? 'offline' as any : undefined
      })
      .eq('id', boothId);

    if (error) throw error;
    await logAdminAction(
      adminEmail,
      nextDeletedState ? 'Menonaktifkan Bilik Suara' : 'Mengaktifkan Bilik Suara',
      boothName
    );
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};
