import { Profile, HelpdeskButton, WafoAnnouncement } from '../types';

interface MockAuthUser {
  id: string;
  email: string;
  password?: string;
}

interface MockSession {
  user: MockAuthUser;
  expires_at?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Candidate {
  id: string;
  category_id: string;
  number: number;
  chairman: string;
  vice: string;
  visi: string;
  misi: string[];
  photo_url?: string;
}

export interface Vote {
  id: string;
  voter_id: string;
  category_id: string;
  candidate_id: string;
  created_at: string;
}

const defaultCategories: Category[] = [
  { id: 'osis',   name: 'Ketua OSIS',           icon: '🏫' },
  { id: 'mpk',    name: 'Ketua MPK',             icon: '📋' },
  { id: 'duta',   name: 'Duta Sekolah',          icon: '⭐' },
  { id: 'ekskul', name: 'Ketua Ekstrakurikuler', icon: '🎯' },
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
      'Mengikuti kompetisi tingkat provinsi dan nasional.',
      'Memperkenalkan keunggulan sekolah melalui media sosial.',
      'Menjadi inspirasi bagi siswa lain untuk berprestasi.',
    ],
  },
  {
    id: 'duta2', category_id: 'duta', number: 2,
    chairman: 'Anisa Rahma',
    vice: '',
    visi: 'Duta yang berjiwa sosial dan menjadi agen perubahan di komunitas sekolah.',
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

const defaultWafoAnnouncements: WafoAnnouncement[] = [
  {
    id: 'wafo-1',
    title: 'Selamat Datang di PPU SMAN 1 Bangsal',
    content: 'Voting pemilihan raya akan segera dimulai. Persiapkan diri Anda dan cermati visi misi setiap kandidat.',
    is_active: true,
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updated_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'wafo-2',
    title: 'Perubahan Jadwal Pemungutan Suara',
    content: 'Terdapat perubahan jadwal untuk kelas XII. Mohon cek halaman informasi untuk detail lebih lanjut.',
    is_active: true,
    created_at: new Date().toISOString(), // Now
    updated_at: new Date().toISOString()
  }
];

// Helper to seed localStorage with default credentials and voting data
export const seedMockData = () => {
  const users = localStorage.getItem('mock_users');
  const profiles = localStorage.getItem('mock_profiles');
  const categories = localStorage.getItem('mock_categories');
  const candidates = localStorage.getItem('mock_candidates');
  const helpdesks = localStorage.getItem('mock_helpdesk_buttons');
  const wafos = localStorage.getItem('mock_wafo_announcements');
  const votes = localStorage.getItem('mock_votes');

  if (true) {
    const defaultUsers: MockAuthUser[] = [];
    localStorage.setItem('mock_users', JSON.stringify(defaultUsers));
  }

  if (true) {
    const defaultProfiles: Profile[] = [];
    localStorage.setItem('mock_profiles', JSON.stringify(defaultProfiles));
  }

  if (!categories) {
    localStorage.setItem('mock_categories', JSON.stringify(defaultCategories));
  }

  if (!candidates) {
    localStorage.setItem('mock_candidates', JSON.stringify(defaultCandidates));
  }

  if (!helpdesks) {
    localStorage.setItem('mock_helpdesk_buttons', JSON.stringify(defaultHelpdeskButtons));
  }

  if (!wafos) {
    localStorage.setItem('mock_wafo_announcements', JSON.stringify(defaultWafoAnnouncements));
  }

  if (!votes) {
    localStorage.setItem('mock_votes', JSON.stringify([]));
  }

  const landingVisibility = localStorage.getItem('mock_landing_page_visibility');
  if (!landingVisibility) {
    const defaultVisibility = [
      { id: 'bilik_suara', is_visible: true },
      { id: 'lihat_hasil', is_visible: true },
      { id: 'login', is_visible: true },
      { id: 'register', is_visible: true },
      { id: 'cara_menggunakan', is_visible: true }
    ];
    localStorage.setItem('mock_landing_page_visibility', JSON.stringify(defaultVisibility));
  }
};

const getTableData = (table: string): any[] => {
  seedMockData();
  const key = `mock_${table}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveTableData = (table: string, data: any[]) => {
  const key = `mock_${table}`;
  localStorage.setItem(key, JSON.stringify(data));
};

export const mockSupabase = {
  auth: {
    async getSession() {
      seedMockData();
      const sessionStr = localStorage.getItem('mock_session');
      if (sessionStr) {
        return { data: { session: JSON.parse(sessionStr) as MockSession }, error: null };
      }
      return { data: { session: null }, error: null };
    },

    async signUp({ email, password }: { email: string; password?: string }) {
      seedMockData();
      const users = getTableData('users') as MockAuthUser[];
      if (users.find(u => u.email === email)) {
        return { data: { user: null }, error: new Error('User already registered') };
      }

      const newUser: MockAuthUser = {
        id: 'usr-' + Math.random().toString(36).substring(2, 11),
        email,
        password
      };

      users.push(newUser);
      saveTableData('users', users);

      const session: MockSession = { user: newUser };
      localStorage.setItem('mock_session', JSON.stringify(session));

      if (onStateChangeCallback) {
        onStateChangeCallback('SIGNED_IN', session);
      }

      return { data: { user: newUser }, error: null };
    },

    async signInWithPassword({ email, password }: { email: string; password?: string }) {
      seedMockData();
      const users = getTableData('users') as MockAuthUser[];
      const found = users.find(u => u.email === email && u.password === password);
      if (!found) {
        return { data: { user: null }, error: new Error('Invalid login credentials') };
      }

      const session: MockSession = { user: found };
      localStorage.setItem('mock_session', JSON.stringify(session));

      if (onStateChangeCallback) {
        onStateChangeCallback('SIGNED_IN', session);
      }

      return { data: { user: found }, error: null };
    },

    async signOut() {
      localStorage.removeItem('mock_session');
      if (onStateChangeCallback) {
        onStateChangeCallback('SIGNED_OUT', null);
      }
      return { error: null };
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      onStateChangeCallback = callback;
      const sessionStr = localStorage.getItem('mock_session');
      if (sessionStr) {
        callback('SIGNED_IN', JSON.parse(sessionStr));
      } else {
        callback('SIGNED_OUT', null);
      }
      return {
        data: {
          subscription: {
            unsubscribe() {
              onStateChangeCallback = null;
            }
          }
        }
      };
    }
  },

  from(table: string) {
    seedMockData();
    const dataList = getTableData(table);

    // Create a flexible query builder
    const queryBuilder = (currentData: any[]) => {
      let filteredData = [...currentData];

      const builder = {
        eq(fieldName: string, value: any) {
          filteredData = filteredData.filter(item => {
            const val = item[fieldName];
            if (typeof val === 'string' && typeof value === 'string') {
              return val.toLowerCase() === value.toLowerCase();
            }
            return val === value;
          });
          return builder;
        },

        order(fieldName: string, { ascending = true } = {}) {
          filteredData.sort((a, b) => {
            if (a[fieldName] < b[fieldName]) return ascending ? -1 : 1;
            if (a[fieldName] > b[fieldName]) return ascending ? 1 : -1;
            return 0;
          });
          return builder;
        },

        async single() {
          if (filteredData.length === 0) {
            return { data: null, error: new Error('Record not found') };
          }
          return { data: filteredData[0], error: null };
        },

        async maybeSingle() {
          if (filteredData.length === 0) {
            return { data: null, error: null };
          }
          return { data: filteredData[0], error: null };
        },

        // Allow direct awaiting of the builder for chain-free calls
        then(onfulfilled: (value: any) => any) {
          return Promise.resolve({ data: filteredData, error: null }).then(onfulfilled);
        },

        async select() {
          return { data: filteredData, error: null };
        }
      };

      return builder;
    };

    return {
      select(fieldsList?: string) {
        return queryBuilder(dataList);
      },

      async insert(items: any | any[]) {
        const records = (Array.isArray(items) ? items : [items]).map(item => ({
          id: item.id || 'id-' + Math.random().toString(36).substring(2, 11),
          ...item,
          created_at: new Date().toISOString()
        }));
        dataList.push(...records);
        saveTableData(table, dataList);
        return { data: Array.isArray(items) ? records : records[0], error: null };
      },

      async upsert(items: any | any[]) {
        const itemsArray = Array.isArray(items) ? items : [items];
        itemsArray.forEach(item => {
          const idx = dataList.findIndex(p => p.id === item.id);
          if (idx >= 0) {
            dataList[idx] = { ...dataList[idx], ...item };
          } else {
            dataList.push({
              id: item.id || 'id-' + Math.random().toString(36).substring(2, 11),
              ...item,
              created_at: new Date().toISOString()
            });
          }
        });
        saveTableData(table, dataList);
        return { data: items, error: null };
      },

      async update(item: any) {
        return {
          eq(fieldName: string, value: any) {
            dataList.forEach((r, idx) => {
              const itemVal = r[fieldName];
              const match = (typeof itemVal === 'string' && typeof value === 'string')
                ? itemVal.toLowerCase() === value.toLowerCase()
                : itemVal === value;
              if (match) {
                dataList[idx] = { ...r, ...item };
              }
            });
            saveTableData(table, dataList);
            return { data: null, error: null };
          }
        };
      },

      async delete() {
        return {
          eq(fieldName: string, value: any) {
            const remaining = dataList.filter(item => item[fieldName] !== value);
            saveTableData(table, remaining);
            return { data: null, error: null };
          }
        };
      }
    };
  }
};

let onStateChangeCallback: ((event: string, session: any) => void) | null = null;
