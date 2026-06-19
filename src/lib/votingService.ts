import { supabase } from './supabase';
import { Category, Candidate, Vote, Profile, Dapil } from '../types';

const defaultCategories: Category[] = [
  { id: 'osis',   name: 'Ketua OSIS',           icon: '🏫', order: 1, type: 'regular' },
  { id: 'mpk',    name: 'Ketua MPK',             icon: '📋', order: 2, type: 'regular' },
  { id: 'duta',   name: 'Duta Sekolah',          icon: '⭐', order: 3, type: 'regular' },
  { id: 'ekskul', name: 'Ketua Ekstrakurikuler', icon: '🎯', order: 4, type: 'regular' },
  { id: 'mpk_smaba', name: 'MPK SMABA',         icon: '🎓', order: 5, type: 'mpk_smaba' },
];

const defaultCandidates: Candidate[] = [
  {
    id: 'osis1', category_id: 'osis', number: 1,
    chairman: 'Rizky Aditya Pratama',
    vice: 'Nadya Putri Lestari',
    visi: 'Mewujudkan OSIS yang aktif, inovatif, dan berprestasi demi kemajuan sekolah bersama.',
    misi: [
      'Meningkatkan kegiatan ekstrakurikuler yang bermakna.',
      'Membangun komunikasi yang baik antara siswa dan guru.',
      'Mengadakan program literasi dan sains bulanan.',
    ],
  },
  {
    id: 'osis2', category_id: 'osis', number: 2,
    chairman: 'Farhan Hidayat',
    vice: 'Siti Nur Aisyah',
    visi: 'Membangun generasi muda yang berkarakter, kreatif, dan siap menghadapi era global.',
    misi: [
      'Mendorong partisipasi siswa dalam kegiatan sosial.',
      'Mengembangkan program kewirausahaan pelajar.',
      'Memperkuat identitas budaya lokal di lingkungan sekolah.',
    ],
  },
  {
    id: 'osis3', category_id: 'osis', number: 3,
    chairman: 'Dinda Permatasari',
    vice: '',
    visi: 'Menciptakan lingkungan sekolah yang inklusif, aman, dan menyenangkan bagi semua.',
    misi: [
      'Membangun ruang aspirasi siswa yang terbuka.',
      'Mengadakan pelatihan kepemimpinan bagi anggota OSIS.',
      'Meningkatkan kesejahteraan siswa melalui program beasiswa internal.',
    ],
  },
  {
    id: 'mpk1', category_id: 'mpk', number: 1,
    chairman: 'Galih Wicaksono',
    vice: 'Putri Ayu Maharani',
    visi: 'MPK sebagai pengawas yang adil, transparan, dan berpihak pada kepentingan siswa.',
    misi: [
      'Memastikan setiap kegiatan OSIS berjalan sesuai aturan.',
      'Membuka saluran pengaduan siswa yang mudah diakses.',
      'Menjalin koordinasi intensif dengan dewan guru.',
    ],
  },
  {
    id: 'mpk2', category_id: 'mpk', number: 2,
    chairman: 'Ilham Saputra',
    vice: 'Reva Damayanti',
    visi: 'Mewujudkan MPK yang responsif dan menjadi mitra strategis OSIS.',
    misi: [
      'Mengadakan rapat evaluasi bulanan yang terbuka.',
      'Memperkuat peran MPK dalam penyusunan program tahunan.',
      'Meningkatkan kapasitas anggota MPK melalui pelatihan.',
    ],
  },
  {
    id: 'duta1', category_id: 'duta', number: 1,
    chairman: 'Calista Maharani',
    vice: 'Kevin Putra Wijaya',
    visi: 'Menjadi duta yang membanggakan dan mempromosikan budaya sekolah ke tingkat nasional.',
    misi: [
      'Mengikuti kompetisi tingkat provinsi and nasional.',
      'Memperkenalkan keunggulan sekolah melalui media sosial.',
      'Menjadi inspirasi bagi siswa lain untuk berprestasi.',
    ],
  },
  {
    id: 'duta2', category_id: 'duta', number: 2,
    chairman: 'Anisa Rahma',
    vice: '',
    visi: 'Duta yang berjiwa sosial and menjadi agen perubahan di komunitas sekolah.',
    misi: [
      'Menggalang program sosial dan kemanusiaan.',
      'Membangun jaringan dengan sekolah-sekolah lain.',
      'Mempromosikan gaya hidup sehat dan ramah lingkungan.',
    ],
  },
  {
    id: 'eks1', category_id: 'ekskul', number: 1,
    chairman: 'Bagas Firmansyah',
    vice: 'Layla Salsabila',
    visi: 'Ekstrakurikuler yang berkualitas, kompetitif, dan menjadi kebanggaan sekolah.',
    misi: [
      'Meningkatkan anggaran dan fasilitas untuk setiap ekskul.',
      'Mengadakan festival ekskul tahunan yang meriah.',
      'Mendorong prestasi ekskul di kancah regional.',
    ],
  },
  {
    id: 'eks2', category_id: 'ekskul', number: 2,
    chairman: 'Tasya Bunga Kinanti',
    vice: 'Rendi Setiawan',
    visi: 'Membangun ekskul yang inklusif dan mengakomodasi minat seluruh siswa.',
    misi: [
      'Membuka ekskul baru sesuai minat siswa.',
      'Menjalin kerjasama dengan komunitas luar sekolah.',
      'Memberikan pelatihan pelatih ekskul yang profesional.',
    ],
  },
];

// Helper to parse JSON or comma-separated classes field
function parseClasses(classesField: any): string[] {
  if (!classesField) return [];
  if (Array.isArray(classesField)) return classesField;
  if (typeof classesField === 'string') {
    try {
      const parsed = JSON.parse(classesField);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      return classesField.split(',').map((x: string) => x.trim()).filter(Boolean);
    }
  }
  return [];
}

// Map db candidate representations to TypeScript types
export function mapDbCandidateToCandidate(db: any, categoryId: string): Candidate {
  const candNum = db.candidate_number !== undefined ? db.candidate_number : (db.number !== undefined ? db.number : 1);
  const candName = db.candidate_name !== undefined ? db.candidate_name : (db.chairman !== undefined ? db.chairman : '');
  const visionText = db.vision !== undefined ? db.vision : (db.visi !== undefined ? db.visi : '');
  let missionList: string[] = [];
  if (db.mission !== undefined) {
    if (Array.isArray(db.mission)) {
      missionList = db.mission;
    } else if (typeof db.mission === 'string') {
      try {
        const parsed = JSON.parse(db.mission);
        if (Array.isArray(parsed)) missionList = parsed;
      } catch (e) {
        missionList = db.mission.split('\n').filter(Boolean);
      }
    }
  } else if (db.misi !== undefined) {
    if (Array.isArray(db.misi)) {
      missionList = db.misi;
    } else if (typeof db.misi === 'string') {
      try {
        const parsed = JSON.parse(db.misi);
        if (Array.isArray(parsed)) missionList = parsed;
      } catch (e) {
        missionList = db.misi.split('\n').filter(Boolean);
      }
    }
  }

  return {
    id: db.id,
    category_id: db.category_id || categoryId,
    number: candNum,
    chairman: candName,
    vice: db.vice || '',
    visi: visionText,
    misi: missionList,
    photo_url: db.photo_url || ''
  };
}

export function mapDbCandidateMpkToCandidate(db: any, categoryId: string): Candidate {
  const candNum = db.candidate_number !== undefined ? db.candidate_number : (db.number !== undefined ? db.number : 1);
  const candName = db.candidate_name !== undefined ? db.candidate_name : (db.chairman !== undefined ? db.chairman : '');
  const visionText = db.vision !== undefined ? db.vision : (db.visi !== undefined ? db.visi : '');
  let missionList: string[] = [];
  if (db.mission !== undefined) {
    if (Array.isArray(db.mission)) {
      missionList = db.mission;
    } else if (typeof db.mission === 'string') {
      try {
        const parsed = JSON.parse(db.mission);
        if (Array.isArray(parsed)) missionList = parsed;
      } catch (e) {
        missionList = db.mission.split('\n').filter(Boolean);
      }
    }
  } else if (db.misi !== undefined) {
    if (Array.isArray(db.misi)) {
      missionList = db.misi;
    } else if (typeof db.misi === 'string') {
      try {
        const parsed = JSON.parse(db.misi);
        if (Array.isArray(parsed)) missionList = parsed;
      } catch (e) {
        missionList = db.misi.split('\n').filter(Boolean);
      }
    }
  }

  return {
    id: db.id,
    category_id: categoryId,
    number: candNum,
    chairman: candName,
    visi: visionText,
    misi: missionList,
    photo_url: db.photo_url || '',
    dapil_id: db.dapil_id || '',
    candidate_class: db.class_name || db.candidate_class || '', // backward safety
    class_name: db.class_name || db.candidate_class || ''
  };
}

// Database Automatic Migration Routine
export const autoMigrateDatabase = async () => {
  try {
    const { data: oldCandidates, error } = await supabase
      .from('candidates')
      .select('*');

    const candidatesList = oldCandidates || [];

    // Identify MPK candidates (category_id === 'mpk_smaba' or having dapil_id)
    const mpkCandidates = candidatesList.filter((c: any) => c.category_id === 'mpk_smaba' || !!c.dapil_id);

    if (mpkCandidates.length > 0) {
      console.log(`[Migration] Migrating ${mpkCandidates.length} MPK Candidates to candidates_mpk...`);

      for (const cand of mpkCandidates) {
        const dbCandidateMpk = {
          id: cand.id,
          dapil_id: cand.dapil_id || 'dapil-1',
          class_name: cand.class_name || cand.candidate_class || '',
          candidate_number: cand.candidate_number !== undefined ? cand.candidate_number : cand.number,
          candidate_name: cand.candidate_name !== undefined ? cand.candidate_name : cand.chairman,
          photo_url: cand.photo_url || '',
          vision: cand.vision !== undefined ? cand.vision : cand.visi,
          mission: Array.isArray(cand.mission) ? cand.mission : (Array.isArray(cand.misi) ? cand.misi : []),
        };

        await supabase.from('candidates_mpk').upsert(dbCandidateMpk);
      }
    }

    // Bidirectional Verification to ensure candidates_mpk are present in candidates table
    const { data: mList } = await supabase.from('candidates_mpk').select('*');
    if (mList && mList.length > 0) {
      console.log(`[Migration] Verifying ${mList.length} candidates_mpk are mirrored in candidates to prevent votes foreign key violations...`);
      for (const m of mList) {
        const exists = candidatesList.some((c: any) => c.id === m.id);
        if (!exists) {
          console.log(`[Migration] Auto-mirroring candidate_mpk with id ${m.id} to candidates table`);
          const { data: catDapil } = await supabase.from('dapils').select('category_id').eq('id', m.dapil_id).single();
          const category_id = catDapil?.category_id || 'mpk';
          
          let parsedMisi: string[] = [];
          if (Array.isArray(m.mission)) {
            parsedMisi = m.mission;
          } else if (typeof m.mission === 'string') {
            try {
              parsedMisi = JSON.parse(m.mission);
            } catch {
              parsedMisi = [];
            }
          }

          await supabase.from('candidates').upsert({
            id: m.id,
            category_id: category_id,
            number: m.candidate_number,
            chairman: m.candidate_name,
            vice: '',
            photo_url: m.photo_url || '',
            visi: m.vision || '',
            misi: parsedMisi
          });
        }
      }
    }

    console.log('[Migration] Database migration completed successfully!');
  } catch (err) {
    console.warn('[Migration] Could not run DB auto-migration:', err);
  }
};

// Sort in-memory to ensure reliability across all platform environments
const sortCategoriesList = (cats: Category[]) => {
  return [...cats].sort((a, b) => {
    const oA = typeof a.order === 'number' ? a.order : 999;
    const oB = typeof b.order === 'number' ? b.order : 999;
    if (oA !== oB) return oA - oB;
    return a.id.localeCompare(b.id);
  });
};

// Load categories from Supabase, throwing actual error
export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*');

  if (error) {
    throw error;
  }

  const mapped = (data || []).map((c: any) => ({
    ...c,
    type: c.type
  }));
  return sortCategoriesList(mapped as Category[]);
};

// Dapil management
export const getDapils = async (categoryId?: string): Promise<Dapil[]> => {
  let query = supabase.from('dapils').select('*');
  if (categoryId) {
    query = query.eq('category_id', categoryId);
    console.log(`SELECT DAPIL QUERY RUNNING: Fetching from dapils where category_id = '${categoryId}'`);
  } else {
    console.log("SELECT DAPIL QUERY RUNNING: Fetching all from dapils");
  }
  const { data, error } = await query;
  console.log("SELECT DAPIL RESULT:", data);
  console.log("SELECT DAPIL ERROR:", error);
  if (error) throw error;
  
  const list = (data || []).map((db: any) => ({
    id: db.id,
    category_id: db.category_id || 'mpk_smaba',
    name: db.name,
    eligible_classes: parseClasses(db.eligible_classes),
    photo_url: db.photo_url || '',
    order: db.order || 0
  }));

  return list.sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const saveDapil = async (dapil: Dapil): Promise<boolean> => {
  const payload = {
    id: dapil.id,
    category_id: dapil.category_id,
    name: dapil.name,
    eligible_classes: dapil.eligible_classes,
    photo_url: dapil.photo_url || '',
    order: dapil.order || 1
  };

  console.log("DAPIL INSERT PAYLOAD:", payload);
  const { data, error } = await supabase.from('dapils').upsert(payload).select();
  console.log("DAPIL INSERT RESULT:", data);
  console.log("DAPIL INSERT ERROR:", error);

  if (error) {
    throw error;
  }
  return true;
};

export const deleteDapil = async (dapilId: string): Promise<boolean> => {
  // We can let Supabase delete candidates_mpk under this dapil if it has ON DELETE CASCADE.
  // Otherwise we delete them first to be safe
  await supabase.from('candidates_mpk').delete().eq('dapil_id', dapilId);
  const { error } = await supabase.from('dapils').delete().eq('id', dapilId);
  if (error) {
    throw error;
  }
  return true;
};

export const getCandidatesByDapil = async (dapilId: string): Promise<Candidate[]> => {
  const { data, error } = await supabase
    .from('candidates_mpk')
    .select('*')
    .eq('dapil_id', dapilId);

  console.log(`SELECT MPK BY DAPIL QUERY RUNNING: Fetching from candidates_mpk where dapil_id = '${dapilId}'`);
  console.log("SELECT BY DAPIL RESULT MPK:", data);
  console.log("SELECT BY DAPIL ERROR MPK:", error);

  if (error) throw error;
  return (data || []).map(db => mapDbCandidateMpkToCandidate(db, 'mpk_smaba'))
                      .sort((a, b) => a.number - b.number);
};

// Load candidates for a category
export const getCandidates = async (categoryId: string): Promise<Candidate[]> => {
  // Check the category's type dynamically
  const { data: catData } = await supabase
    .from('categories')
    .select('type')
    .eq('id', categoryId)
    .single();

  const isMpk = categoryId === 'mpk_smaba' || catData?.type === 'mpk_smaba';

  if (isMpk) {
    // For MPK, fetch all dapils under this category
    const { data: dapilData } = await supabase
      .from('dapils')
      .select('id')
      .eq('category_id', categoryId);

    const dapilIds = (dapilData || []).map(d => d.id);
    if (dapilIds.length === 0) {
      console.log("SELECT MPK QUERY RUNNING: Fetching from candidates_mpk for categoryId:", categoryId);
      console.log("SELECT RESULT MPK: No dapils in this category, returning empty.");
      return [];
    }

    const { data, error } = await supabase
      .from('candidates_mpk')
      .select('*')
      .in('dapil_id', dapilIds);

    console.log("SELECT MPK QUERY RUNNING: Fetching all candidates from candidates_mpk with dapilIds:", dapilIds);
    console.log("SELECT RESULT MPK:", data);
    console.log("SELECT ERROR MPK:", error);

    if (error) throw error;
    return (data || []).map(db => mapDbCandidateMpkToCandidate(db, categoryId))
                       .sort((a, b) => a.number - b.number);
  } else {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('category_id', categoryId);

    console.log("SELECT REGULER QUERY RUNNING: Fetching candidates from candidates with categoryId:", categoryId);
    console.log("SELECT RESULT REGULER:", data);
    console.log("SELECT ERROR REGULER:", error);

    if (error) throw error;
    return (data || []).map(db => mapDbCandidateToCandidate(db, categoryId))
                       .sort((a, b) => a.number - b.number);
  }
};

// Get all votes cast across all categories
export const getAllVotes = async (): Promise<Vote[]> => {
  const { data, error } = await supabase.from('votes').select('*');
  if (error) throw error;
  return data as Vote[];
};

// Save (insert/update) candidate
export const saveCandidate = async (candidate: Candidate): Promise<boolean> => {
  const isMpk = candidate.category_id === 'mpk_smaba' || !!candidate.dapil_id;

  if (isMpk) {
    const dbCandidateMpk = {
      id: candidate.id,
      dapil_id: candidate.dapil_id || 'dapil-1',
      class_name: candidate.class_name || candidate.candidate_class || '',
      candidate_number: candidate.number,
      candidate_name: candidate.chairman,
      photo_url: candidate.photo_url || '',
      vision: candidate.visi,
      mission: candidate.misi || []
    };

    // Ensure it also exists in reguler candidates to satisfy foreign key constraints of votes table
    const dbCandidateReguler = {
      id: candidate.id,
      category_id: candidate.category_id,
      number: candidate.number,
      chairman: candidate.chairman,
      vice: '',
      photo_url: candidate.photo_url || '',
      visi: candidate.visi,
      misi: candidate.misi || []
    };

    await supabase.from('candidates').upsert(dbCandidateReguler);
    
    const { data, error } = await supabase.from('candidates_mpk').upsert(dbCandidateMpk).select();
    console.log("INSERT RESULT:", data);
    console.log("INSERT ERROR:", error);
    if (error) {
      throw error;
    }
    return true;
  } else {
    const dbCandidateReguler = {
      id: candidate.id,
      category_id: candidate.category_id,
      number: candidate.number,
      chairman: candidate.chairman,
      vice: candidate.vice || '',
      photo_url: candidate.photo_url || '',
      visi: candidate.visi,
      misi: candidate.misi || []
    };

    const { data, error } = await supabase.from('candidates').upsert(dbCandidateReguler).select();
    console.log("INSERT REGULER RESULT:", data);
    console.log("INSERT REGULER ERROR:", error);
    if (error) {
      throw error;
    }
    return true;
  }
};

// Delete candidate
export const deleteCandidate = async (candidateId: string): Promise<boolean> => {
  const [resReg, resMpk] = await Promise.all([
    supabase.from('candidates').delete().eq('id', candidateId),
    supabase.from('candidates_mpk').delete().eq('id', candidateId)
  ]);

  if (resReg.error) throw resReg.error;
  if (resMpk.error) throw resMpk.error;

  return true;
};

// Save (insert/update) category
export const saveCategory = async (category: Category): Promise<boolean> => {
  const dbCat = {
    id: category.id,
    name: category.name,
    icon: category.icon,
    type: category.type
  };
  
  console.log("CATEGORY PAYLOAD:", dbCat);
  const { error } = await supabase.from('categories').upsert(dbCat);
  if (error) {
    throw error;
  }
  return true;
};

// Delete category
export const deleteCategory = async (categoryId: string): Promise<boolean> => {
  const { error } = await supabase.from('categories').delete().eq('id', categoryId);
  if (error) {
    throw error;
  }
  return true;
};

// Reset all votes and reset users' voting status to 'belum'
export const resetAllVotingData = async (adminEmail: string): Promise<boolean> => {
  try {
    // 1. Delete all database votes
    const { error: errorVotes } = await supabase.from('votes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (errorVotes) {
      console.error('Error deleting votes:', errorVotes);
      return false;
    }

    // 2. Set all voter profiles back to 'belum'
    const { error: errorProfiles } = await supabase.from('profiles').update({ voting_status: 'belum' }).eq('role', 'user');
    if (errorProfiles) {
      console.error('Error updating profiles:', errorProfiles);
      return false;
    }
    
    // Clear localStorage votes
    localStorage.setItem('mock_votes', '[]');
    
    // Also update mock_profiles in localStorage
    const mockProfilesStr = localStorage.getItem('mock_profiles');
    if (mockProfilesStr) {
      const mockProfiles = JSON.parse(mockProfilesStr);
      const updatedProfiles = mockProfiles.map((p: any) => {
        if (p.role === 'user') {
          return { ...p, voting_status: 'belum' };
        }
        return p;
      });
      localStorage.setItem('mock_profiles', JSON.stringify(updatedProfiles));
    }

    return true;
  } catch (err) {
    console.error('Error resetting all voting data:', err);
    return false;
  }
};

// Verify voter profile by card_id
export const verifyVoterByCardId = async (cardId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('card_id', cardId)
      .maybeSingle();

    if (error) throw error;
    return data as Profile | null;
  } catch (err) {
    console.error('Error verifying voter by card id:', err);
    return null;
  }
};

// Get all votes submitted by a specific voter
export const getVoterSubmittedVotes = async (voterId: string): Promise<Vote[]> => {
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('voter_id', voterId);

    if (error) {
      // Fallback to localStorage if table doesn't exist
      const localVotesStr = localStorage.getItem('mock_votes');
      if (localVotesStr) {
        const localVotes: Vote[] = JSON.parse(localVotesStr);
        return localVotes.filter(v => v.voter_id === voterId);
      }
      return [];
    }
    return (data || []) as Vote[];
  } catch (err) {
    console.error('Error fetching voter submitted votes:', err);
    return [];
  }
};

export interface VotingCompletion {
  allCompleted: boolean;
  categories: {
    categoryId: string;
    categoryName: string;
    completed: boolean;
    requiredCount?: number;
    votedCount?: number;
  }[];
}

// Centrally get complete status using live Supabase data
export const getVotingCompletionStatus = async (voterId: string): Promise<VotingCompletion> => {
  try {
    // 1. Get Voter's profile
    const { data: voter, error: voterErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', voterId)
      .single();

    if (voterErr || !voter) {
      console.error('getVotingCompletionStatus: Profile not found', voterErr);
      return { allCompleted: false, categories: [] };
    }

    const voterClass = voter.class || '';

    // 2. Fetch Active Categories
    const { data: categories, error: catErr } = await supabase
      .from('categories')
      .select('*');

    if (catErr || !categories) {
      console.error('getVotingCompletionStatus: Categories not found', catErr);
      return { allCompleted: false, categories: [] };
    }

    // 3. Fetch Voter's Votes
    const { data: votes, error: voteErr } = await supabase
      .from('votes')
      .select('*')
      .eq('voter_id', voterId);

    const voterVotes = votes || [];

    // Let's analyze completion for each category
    const catStatuses = [];

    // Pre-look up all dapils and candidates_mpk just once if there is an MPK category
    const hasMpkCategory = categories.some(c => c.type === 'mpk_smaba');
    let dapils: any[] = [];
    let mpkCandidates: any[] = [];

    if (hasMpkCategory) {
      const { data: dList } = await supabase.from('dapils').select('*');
      dapils = dList || [];

      // Find the voter's Dapil
      const voterDapil = dapils.find(d => d.eligible_classes && d.eligible_classes.includes(voterClass));
      if (voterDapil) {
        const { data: mList } = await supabase
          .from('candidates_mpk')
          .select('*')
          .eq('dapil_id', voterDapil.id);
        mpkCandidates = mList || [];
      }
    }

    for (const cat of categories) {
      if (cat.type === 'mpk_smaba') {
        // MPK logic:
        // Group candidates by class_name (class_name or candidate_class)
        const grouped: Record<string, any[]> = {};
        mpkCandidates.forEach(cand => {
          const cls = cand.class_name || cand.candidate_class || "Lainnya";
          if (!grouped[cls]) grouped[cls] = [];
          grouped[cls].push(cand);
        });

        const requiredClasses = Object.keys(grouped).sort();
        const requiredCount = requiredClasses.length;

        // Count filter votes submitted for this MPK category
        const catVotes = voterVotes.filter(v => v.category_id === cat.id);
        
        // Match the class_name of voted candidates
        const votedClasses: string[] = [];
        catVotes.forEach(v => {
          const cand = mpkCandidates.find(m => m.id === v.candidate_id);
          if (cand) {
            const cls = cand.class_name || cand.candidate_class || "Lainnya";
            votedClasses.push(cls);
          }
        });
        const uniqueVotedClasses = Array.from(new Set(votedClasses));
        const votedCount = uniqueVotedClasses.length;

        const isCompleted = requiredCount > 0 && requiredClasses.every(cls => uniqueVotedClasses.includes(cls));

        catStatuses.push({
          categoryId: cat.id,
          categoryName: cat.name,
          completed: isCompleted,
          requiredCount,
          votedCount
        });
      } else {
        // Regular logic
        const hasVoted = voterVotes.some(v => v.category_id === cat.id);
        catStatuses.push({
          categoryId: cat.id,
          categoryName: cat.name,
          completed: hasVoted
        });
      }
    }

    const allCompleted = catStatuses.length > 0 && catStatuses.every(c => c.completed);

    console.log("=== AUDIT VOTING COMPLETION STATUS ===");
    console.log("VOTER ID:", voterId);
    console.log("VOTER NAME:", voter.full_name);
    console.log("VOTER CLASS:", voterClass);
    console.log("ACTIVE CATEGORIES:", categories.map(c => ({ id: c.id, name: c.name, type: c.type })));
    console.log("CATEGORY STATUS:", catStatuses);
    console.log("ALL COMPLETED:", allCompleted);
    console.log("VOTING ACCESS ALLOWED:", !allCompleted);

    return {
      allCompleted,
      categories: catStatuses
    };
  } catch (err) {
    console.error('Error in getVotingCompletionStatus:', err);
    return { allCompleted: false, categories: [] };
  }
};

// Submit a single vote
export const submitVote = async (vote: Vote): Promise<boolean> => {
  try {
    const sessionRes = await supabase.auth.getSession();
    const activeUid = sessionRes.data?.session?.user?.id || null;
    const votesPayload = {
      voter_id: vote.voter_id,
      category_id: vote.category_id,
      candidate_id: vote.candidate_id
    };

    console.log("--- SUBMIT REGULER AUDIT ---");
    console.log("ACTIVE AUTH UID:", activeUid);
    console.log("SUBMIT REGULER PAYLOAD:", votesPayload);

    // Check if voter has already voted in this category to prevent duplicate
    const existingVotes = await getVoterSubmittedVotes(vote.voter_id);
    if (existingVotes.some(v => v.category_id === vote.category_id)) {
      console.error('Voter has already completed this category');
      throw new Error('Anda sudah memberikan suara untuk kategori ini.');
    }

    const { data, error } = await supabase
      .from('votes')
      .insert(votesPayload)
      .select();

    console.log("SUPABASE INSERT RESULT:", data);
    console.log("SUPABASE INSERT ERROR:", error);

    if (error) {
      console.error("SUPABASE ERROR OCCURRED, THROWING ERROR...");
      console.log("RETURN VALUE: false (error thrown)");
      throw new Error(error.message || 'Gagal menyimpan suara ke database.');
    }

    console.log("RETURN VALUE: true");
    return true;
  } catch (err: any) {
    console.error('Error submitting vote:', err);
    throw err;
  }
};

// Submit multiple votes at once (useful for MPK categories)
export const submitMultipleVotes = async (votes: Vote[]): Promise<boolean> => {
  try {
    if (votes.length === 0) return true;
    
    const { voter_id, category_id } = votes[0];
    const sessionRes = await supabase.auth.getSession();
    const activeUid = sessionRes.data?.session?.user?.id || null;
    const votesPayload = votes.map(v => ({
      voter_id: v.voter_id,
      category_id: v.category_id,
      candidate_id: v.candidate_id
    }));

    console.log("--- SUBMIT MPK AUDIT ---");
    console.log("ACTIVE AUTH UID:", activeUid);
    console.log("SUBMIT MPK PAYLOAD:", votesPayload);
    
    // Check if voter has already voted in this category
    const existingVotes = await getVoterSubmittedVotes(voter_id);
    if (existingVotes.some(v => v.category_id === category_id)) {
      console.error('Voter has already completed this category');
      throw new Error('Anda sudah memberikan suara untuk kategori MPK ini.');
    }

    const { data, error } = await supabase
      .from('votes')
      .insert(votesPayload)
      .select();

    console.log("SUPABASE INSERT RESULT:", data);
    console.log("SUPABASE INSERT ERROR:", error);

    if (error) {
      console.error("SUPABASE ERROR OCCURRED, THROWING ERROR...");
      console.log("RETURN VALUE: false (error thrown)");
      throw new Error(error.message || 'Gagal menyimpan seluruh suara MPK ke database.');
    }

    console.log("RETURN VALUE: true");
    return true;
  } catch (err: any) {
    console.error('Error submitting multiple votes:', err);
    throw err;
  }
};

// Update voting status to "sudah" when finalized
export const finalizeVotingStatus = async (voterId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: voterId,
        voting_status: 'sudah'
      });

    if (error) {
      // Fallback update profile in localStorage mock
      const mockProfilesStr = localStorage.getItem('mock_profiles');
      if (mockProfilesStr) {
        const mockProfiles: Profile[] = JSON.parse(mockProfilesStr);
        const idx = mockProfiles.findIndex(p => p.id === voterId);
        if (idx >= 0) {
          mockProfiles[idx].voting_status = 'sudah';
          localStorage.setItem('mock_profiles', JSON.stringify(mockProfiles));
        }
      }
    }
    return true;
  } catch (err) {
    console.error('Error finalizing voting status:', err);
    return false;
  }
};

export interface ElectionStatistics {
  totalDpt: number;
  completedVoters: number;
  participationRate: number;
  classParticipation: {
    className: string;
    completedCount: number;
    totalCount: number;
    percentage: number;
  }[];
  classContribution: {
    className: string;
    completedCount: number;
    percentage: number;
  }[];
}

const matchClassToDapil = (vClass: string, d: any): boolean => {
  if (!d || !d.eligible_classes) return false;
  if (Array.isArray(d.eligible_classes)) {
    return d.eligible_classes.includes(vClass);
  }
  if (typeof d.eligible_classes === 'string') {
    try {
      const parsed = JSON.parse(d.eligible_classes);
      if (Array.isArray(parsed)) {
        return parsed.includes(vClass);
      }
    } catch {
      // ignore
    }
    return d.eligible_classes.includes(vClass);
  }
  return false;
};

const isVoterCompleted = (
  voterId: string,
  voterClass: string,
  voterVotes: any[],
  categories: any[],
  dapils: any[],
  mpkCandidates: any[]
): boolean => {
  if (categories.length === 0) return false;

  const catStatuses: boolean[] = [];

  for (const cat of categories) {
    if (cat.type === 'mpk_smaba') {
      const voterDapil = dapils.find(d => matchClassToDapil(voterClass, d));
      if (!voterDapil) {
        catStatuses.push(true);
        continue;
      }

      const dCandidates = mpkCandidates.filter(m => m.dapil_id === voterDapil.id);
      if (dCandidates.length === 0) {
        catStatuses.push(true);
        continue;
      }

      const grouped: Record<string, any[]> = {};
      dCandidates.forEach(cand => {
        const cls = cand.class_name || cand.candidate_class || "Lainnya";
        if (!grouped[cls]) grouped[cls] = [];
        grouped[cls].push(cand);
      });

      const requiredClasses = Object.keys(grouped).sort();
      const requiredCount = requiredClasses.length;

      const catVotes = voterVotes.filter(v => v.category_id === cat.id);

      const votedClasses: string[] = [];
      catVotes.forEach(v => {
        const cand = dCandidates.find(m => m.id === v.candidate_id);
        if (cand) {
          const cls = cand.class_name || cand.candidate_class || "Lainnya";
          votedClasses.push(cls);
        }
      });
      const uniqueVotedClasses = Array.from(new Set(votedClasses));

      const isCompleted = requiredCount > 0 && requiredClasses.every(cls => uniqueVotedClasses.includes(cls));
      catStatuses.push(isCompleted);
    } else {
      const hasVoted = voterVotes.some(v => v.category_id === cat.id);
      catStatuses.push(hasVoted);
    }
  }

  return catStatuses.length > 0 && catStatuses.every(Boolean);
};

export const getElectionStatistics = async (): Promise<ElectionStatistics> => {
  let profiles: Profile[] = [];
  let categories: Category[] = [];
  let votes: Vote[] = [];
  let dapils: Dapil[] = [];
  let mpkCandidates: any[] = [];

  try {
    const { data: pData, error: pErr } = await supabase.from('profiles').select('*');
    if (pErr) throw pErr;
    profiles = pData || [];
  } catch (e) {
    const localProfilesStr = localStorage.getItem('mock_profiles') || '[]';
    profiles = JSON.parse(localProfilesStr);
  }

  try {
    const { data: cData, error: cErr } = await supabase.from('categories').select('*');
    if (cErr) throw cErr;
    categories = cData || [];
  } catch (e) {
    categories = [];
  }

  try {
    const { data: vData, error: vErr } = await supabase.from('votes').select('*');
    if (vErr) throw vErr;
    votes = vData || [];
  } catch (e) {
    const localVotesStr = localStorage.getItem('mock_votes') || '[]';
    votes = JSON.parse(localVotesStr);
  }

  try {
    const { data: dData, error: dErr } = await supabase.from('dapils').select('*');
    if (dErr) throw dErr;
    dapils = dData || [];
  } catch (e) {
    const localDapilsStr = localStorage.getItem('mock_dapils') || '[]';
    dapils = JSON.parse(localDapilsStr);
  }

  try {
    const { data: mData, error: mErr } = await supabase.from('candidates_mpk').select('*');
    if (mErr) throw mErr;
    mpkCandidates = mData || [];
  } catch (e) {
    const localMpkStr = localStorage.getItem('mock_candidates_mpk') || '[]';
    mpkCandidates = JSON.parse(localMpkStr);
  }

  const activeVoters = profiles.filter(p => p.role === 'user' && !p.is_deleted);
  const totalDpt = activeVoters.length;

  const votesByVoter: Record<string, Vote[]> = {};
  votes.forEach(v => {
    if (!votesByVoter[v.voter_id]) {
      votesByVoter[v.voter_id] = [];
    }
    votesByVoter[v.voter_id].push(v);
  });

  let completedCount = 0;
  const completedVoterIds = new Set<string>();

  activeVoters.forEach(voter => {
    const vVotes = votesByVoter[voter.id] || [];
    const voterClass = voter.class || '';
    
    const isCompleted = isVoterCompleted(
      voter.id,
      voterClass,
      vVotes,
      categories,
      dapils,
      mpkCandidates
    );

    if (isCompleted) {
      completedCount++;
      completedVoterIds.add(voter.id);
    }
  });

  const participationRate = totalDpt > 0 ? (completedCount / totalDpt) * 100 : 0;

  const classesTotalDpt: Record<string, number> = {};
  const classesCompleted: Record<string, number> = {};

  activeVoters.forEach(v => {
    const cls = v.class || 'Lainnya';
    classesTotalDpt[cls] = (classesTotalDpt[cls] || 0) + 1;
    if (completedVoterIds.has(v.id)) {
      classesCompleted[cls] = (classesCompleted[cls] || 0) + 1;
    }
  });

  const classParticipation = Object.keys(classesTotalDpt).map(cls => {
    const total = classesTotalDpt[cls] || 0;
    const completed = classesCompleted[cls] || 0;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    return {
      className: cls,
      completedCount: completed,
      totalCount: total,
      percentage
    };
  }).sort((a, b) => {
    // Sort GTK to top
    if (a.className === 'GTK') return -1;
    if (b.className === 'GTK') return 1;
    return b.percentage - a.percentage || a.className.localeCompare(b.className);
  });

  const classContribution = Object.keys(classesTotalDpt).map(cls => {
    const completed = classesCompleted[cls] || 0;
    const percentage = completedCount > 0 ? (completed / completedCount) * 100 : 0;
    return {
      className: cls,
      completedCount: completed,
      percentage
    };
  }).sort((a, b) => {
    // Sort GTK to top
    if (a.className === 'GTK') return -1;
    if (b.className === 'GTK') return 1;
    return b.percentage - a.percentage || a.className.localeCompare(b.className);
  });

  // Console audit logs as requested
  console.log("=== AUDIT RUNTIME: STATISTIK PEMILU ===");
  console.log("TOTAL DPT (Profiles with role=user):", totalDpt);
  console.log("ACTIVE CATEGORIES:", categories.map(c => `${c.name} (${c.type})`).join(', '));
  console.log("COMPLETED VOTERS (Full Obligation Met):", `${completedCount} dari ${totalDpt} Pemilih`);
  
  console.log("CLASS PARTICIPATION:");
  classParticipation.forEach((item) => {
    console.log(`- ${item.className}: ${item.completedCount}/${item.totalCount} Selesai (${item.percentage.toFixed(1)}%)`);
  });

  console.log("CLASS CONTRIBUTION:");
  classContribution.forEach((item) => {
    console.log(`- ${item.className}: ${item.completedCount} suara (${item.percentage.toFixed(1)}%)`);
  });
  console.log("======================================");

  return {
    totalDpt,
    completedVoters: completedCount,
    participationRate: participationRate,
    classParticipation,
    classContribution,
  };
};
