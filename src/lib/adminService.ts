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

    if (!isSupabaseConfigured) {
      const localLogsStr = localStorage.getItem('mock_audit_logs') || '[]';
      const localLogs = JSON.parse(localLogsStr);
      localLogs.push({
        id: 'log-' + Math.random().toString(36).substring(2, 11),
        ...newLog
      });
      localStorage.setItem('mock_audit_logs', JSON.stringify(localLogs));
      return;
    }

    const { error } = await supabase.from('audit_logs').insert(newLog);
    if (error) {
      if (import.meta.env.DEV) console.error('[DB] INSERT audit_logs ERROR:', error);
    } else if (import.meta.env.DEV) {
      console.log('[DB] INSERT audit_logs SUCCESS');
    }
  } catch (err) {
    console.error('Failed to log admin action:', err);
  }
};

// Fetch audit logs
export const getAuditLogs = async (): Promise<AuditLog[]> => {
  if (!isSupabaseConfigured) {
    const localLogsStr = localStorage.getItem('mock_audit_logs') || '[]';
    const logs: AuditLog[] = JSON.parse(localLogsStr);
    logs.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    return logs;
  }

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    if (import.meta.env.DEV) console.error('[DB] GET audit_logs ERROR:', error);
    if (error.code === '42P01') {
      console.warn('[DB] Table audit_logs missing in Supabase.');
      return [];
    }
    throw new Error(`Gagal mengambil data audit log: ${error.message}`);
  }

  if (import.meta.env.DEV) console.log('[DB] GET audit_logs SUCCESS', data?.length);
  return (data as AuditLog[]) || [];
};

// Fetch all profiles (voters/admins)
export const getAllProfiles = async (): Promise<Profile[]> => {
  if (!isSupabaseConfigured) {
    const localProfilesStr = localStorage.getItem('mock_profiles') || '[]';
    return JSON.parse(localProfilesStr) as Profile[];
  }

  const { data, error } = await supabase.from('profiles').select('*');

  if (error) {
    if (import.meta.env.DEV) console.error('[DB] GET profiles ERROR:', error);
    throw new Error(`Gagal mengambil data profil: ${error.message}`);
  }

  if (import.meta.env.DEV) console.log('[DB] GET profiles SUCCESS', data?.length);
  return (data as Profile[]) || [];
};

// Confirm user account status
export const confirmVoterAccount = async (
  adminEmail: string,
  voterId: string,
  voterName: string,
  cardId: string
): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    const localProfilesStr = localStorage.getItem('mock_profiles');
    if (localProfilesStr) {
      const profiles: Profile[] = JSON.parse(localProfilesStr);
      const idx = profiles.findIndex(p => p.id === voterId);
      if (idx >= 0) {
        profiles[idx].account_status = 'dikonfirmasi';
        localStorage.setItem('mock_profiles', JSON.stringify(profiles));
        await logAdminAction(adminEmail, 'Admin confirmed voter (Mock)', `${voterName} (Card ID: ${cardId})`);
        return true;
      }
    }
    return false;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ account_status: 'dikonfirmasi' })
    .eq('id', voterId);

  if (error) {
    if (import.meta.env.DEV) console.error('[DB] UPDATE profiles confirm ERROR:', error);
    return false;
  }

  if (import.meta.env.DEV) console.log('[DB] UPDATE profiles confirm SUCCESS', voterId);
  await logAdminAction(adminEmail, 'Admin confirmed voter', `${voterName} (Card ID: ${cardId})`);
  return true;
};

// Reset confirmation status
export const resetVoterConfirmation = async (
  adminEmail: string,
  voterId: string,
  voterName: string,
  cardId: string
): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    const localProfilesStr = localStorage.getItem('mock_profiles');
    if (localProfilesStr) {
      const profiles: Profile[] = JSON.parse(localProfilesStr);
      const idx = profiles.findIndex(p => p.id === voterId);
      if (idx >= 0) {
        profiles[idx].account_status = 'belum_dikonfirmasi';
        localStorage.setItem('mock_profiles', JSON.stringify(profiles));
        await logAdminAction(adminEmail, 'Admin reset confirmation (Mock)', `${voterName} (Card ID: ${cardId})`);
        return true;
      }
    }
    return false;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ account_status: 'belum_dikonfirmasi' })
    .eq('id', voterId);

  if (error) {
    if (import.meta.env.DEV) console.error('[DB] UPDATE profiles reset confirmation ERROR:', error);
    return false;
  }

  if (import.meta.env.DEV) console.log('[DB] UPDATE profiles reset confirmation SUCCESS', voterId);
  await logAdminAction(adminEmail, 'Admin reset confirmation', `${voterName} (Card ID: ${cardId})`);
  return true;
};

// Reset confirmation status for ALL voters
export const resetAllVotersConfirmation = async (
  adminEmail: string
): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    const localProfilesStr = localStorage.getItem('mock_profiles');
    if (localProfilesStr) {
      const profiles: Profile[] = JSON.parse(localProfilesStr);
      const updated = profiles.map(p => p.role === 'user' ? { ...p, account_status: 'belum_dikonfirmasi' as const } : p);
      localStorage.setItem('mock_profiles', JSON.stringify(updated));
      await logAdminAction(adminEmail, 'Admin reset all voter confirmations (Mock)', 'Seluruh status konfirmasi akun di-reset ke Belum Dikonfirmasi');
      return true;
    }
    return false;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ account_status: 'belum_dikonfirmasi' })
    .eq('role', 'user');

  if (error) {
    if (import.meta.env.DEV) console.error('[DB] UPDATE resetAllVotersConfirmation ERROR:', error);
    return false;
  }

  if (import.meta.env.DEV) console.log('[DB] UPDATE resetAllVotersConfirmation SUCCESS');
  await logAdminAction(adminEmail, 'Admin reset all voter confirmations', 'Seluruh status konfirmasi akun di-reset ke Belum Dikonfirmasi');
  return true;
};

// Reset voter history and votes
export const resetVoterHistory = async (
  adminEmail: string,
  voterId: string,
  voterName: string,
  cardId: string
): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    const localVotesStr = localStorage.getItem('mock_votes');
    if (localVotesStr) {
      const votes = JSON.parse(localVotesStr);
      const remainingVotes = votes.filter((v: any) => v.voter_id !== voterId);
      localStorage.setItem('mock_votes', JSON.stringify(remainingVotes));
    }
    const localProfilesStr = localStorage.getItem('mock_profiles');
    if (localProfilesStr) {
      const profiles: Profile[] = JSON.parse(localProfilesStr);
      const idx = profiles.findIndex(p => p.id === voterId);
      if (idx >= 0) {
        profiles[idx].voting_status = 'belum';
        localStorage.setItem('mock_profiles', JSON.stringify(profiles));
      }
    }
    await logAdminAction(adminEmail, 'Admin reset voting history (Mock)', `${voterName} (Card ID: ${cardId})`);
    return true;
  }

  const { error: deleteError } = await supabase
    .from('votes')
    .delete()
    .eq('voter_id', voterId);

  if (deleteError && import.meta.env.DEV) {
    console.error('[DB] DELETE votes ERROR:', deleteError);
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ voting_status: 'belum' })
    .eq('id', voterId);

  if (profileError) {
    if (import.meta.env.DEV) console.warn('[DB] UPDATE profile voting_status warning:', profileError.message || profileError);
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

  if (import.meta.env.DEV) console.log('[DB] RESET voter history SUCCESS', voterId);
  await logAdminAction(adminEmail, 'Admin reset voting history', `${voterName} (Card ID: ${cardId})`);
  return true;
};

// Soft delete account
export const softDeleteVoter = async (
  adminEmail: string,
  voterId: string,
  voterName: string,
  cardId: string
): Promise<boolean> => {
  const deletionTime = new Date().toISOString();

  if (!isSupabaseConfigured) {
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
    await logAdminAction(adminEmail, 'Admin deleted account (Mock)', `${voterName} (Card ID: ${cardId})`);
    return true;
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      is_deleted: true,
      deleted_at: deletionTime
    })
    .eq('id', voterId);

  if (error) {
    if (import.meta.env.DEV) console.warn('[DB] SOFT DELETE voter warning:', error.message || error);
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
    await logAdminAction(adminEmail, 'Admin deleted account', `${voterName} (Card ID: ${cardId})`);
    return true;
  }

  if (import.meta.env.DEV) console.log('[DB] SOFT DELETE voter SUCCESS', voterId);
  await logAdminAction(adminEmail, 'Admin deleted account', `${voterName} (Card ID: ${cardId})`);
  return true;
};

// Restore account
export const restoreVoter = async (
  adminEmail: string,
  voterId: string,
  voterName: string,
  cardId: string
): Promise<boolean> => {
  if (!isSupabaseConfigured) {
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
    await logAdminAction(adminEmail, 'Admin restored account (Mock)', `${voterName} (Card ID: ${cardId})`);
    return true;
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      is_deleted: false,
      deleted_at: null
    })
    .eq('id', voterId);

  if (error) {
    if (import.meta.env.DEV) console.warn('[DB] RESTORE voter warning:', error.message || error);
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
    await logAdminAction(adminEmail, 'Admin restored account', `${voterName} (Card ID: ${cardId})`);
    return true;
  }

  if (import.meta.env.DEV) console.log('[DB] RESTORE voter SUCCESS', voterId);
  await logAdminAction(adminEmail, 'Admin restored account', `${voterName} (Card ID: ${cardId})`);
  return true;
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
      (p: any) => (p.role === 'vote' || p.role === 'bilik') && !p.is_deleted && p.booth_code?.toUpperCase() === boothCode.toUpperCase()
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
      role: 'bilik',
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
          role: 'bilik',
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
        (p: any) => p.id !== boothId && (p.role === 'vote' || p.role === 'bilik') && !p.is_deleted && p.booth_code?.toUpperCase() === boothCode.toUpperCase()
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
      .in('role', ['vote', 'bilik'])
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

// CREATE ADMIN OR CREATOR
export const createAdminOrCreator = async (
  adminEmail: string,
  name: string,
  email: string,
  password: string,
  role: 'admin' | 'creator'
): Promise<{ success: boolean; error?: string }> => {
  // Validate unique email in profiles first
  try {
    const existing = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
    if (existing && existing.data) {
      return { success: false, error: 'Email login sudah digunakan.' };
    }
  } catch (e) {}

  const uniqueCardId = 'adm-' + Math.random().toString(36).substring(2, 11);

  if (!isSupabaseConfigured) {
    const localProfilesStr = localStorage.getItem('mock_profiles') || '[]';
    const profiles = JSON.parse(localProfilesStr);
    
    const localUsersStr = localStorage.getItem('mock_users') || '[]';
    const users = JSON.parse(localUsersStr);

    if (users.find((u: any) => u.email === email)) {
      return { success: false, error: 'Email login sudah digunakan.' };
    }

    const newUserId = 'usr-' + Math.random().toString(36).substring(2, 11);
    users.push({ id: newUserId, email, password });
    localStorage.setItem('mock_users', JSON.stringify(users));

    const newProfile: Profile = {
      id: newUserId,
      full_name: name,
      email: email,
      role: role,
      account_status: 'dikonfirmasi',
      voting_status: 'offline',
      class: 'Administrator',
      card_id: uniqueCardId,
      created_at: new Date().toISOString(),
      is_deleted: false,
    };

    profiles.push(newProfile);
    localStorage.setItem('mock_profiles', JSON.stringify(profiles));

    await logAdminAction(adminEmail, `Membuat ${role === 'creator' ? 'Creator' : 'Admin'} baru (Mock)`, `${name} (${email})`);
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
          role: role,
          account_status: 'dikonfirmasi',
          voting_status: 'offline',
          class: 'Administrator',
          card_id: uniqueCardId,
          is_deleted: false,
        });

      if (profileError) {
        return { success: false, error: profileError.message };
      }

      await logAdminAction(adminEmail, `Membuat ${role === 'creator' ? 'Creator' : 'Admin'} baru`, `${name} (${email})`);
      return { success: true };
    }

    return { success: false, error: `Gagal membuat akun ${role === 'creator' ? 'Creator' : 'Admin'}.` };
  } catch (err: any) {
    console.error(err);
    return { success: false, error: err.message || 'Terjadi kesalahan sistem.' };
  }
};
