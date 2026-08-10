import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

// Configuration
const PORT = 3000;
const MAX_CONCURRENT_SIGNUPS = 30;

// Supabase Configuration from Environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') && 
  !supabaseAnonKey.includes('placeholder');

// Queue Item Interface
interface QueueItem {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  classField: string;
  status: 'waiting' | 'processing' | 'success' | 'failed';
  error: string | null;
  createdAt: number;
  lastSeen: number;
  processedAt?: number;
  completedAt?: number;
  result?: any;
}

// Global In-Memory Queue State
let queueCounter = 0;
const queue: QueueItem[] = [];

// Centralized Statistics for Logs and Diagnostics
let statsTotalReceived = 0;
let statsTotalSuccess = 0;
let statsTotalFailed = 0;
let statsTotal429 = 0;
let totalWaitTimeMs = 0;
let totalSignupTimeMs = 0;

function logQueueStats() {
  const waitingCount = queue.filter(q => q.status === 'waiting').length;
  const processingCount = queue.filter(q => q.status === 'processing').length;
  const completedCount = statsTotalSuccess;
  const failedCount = statsTotalFailed;
  
  const avgWaitTimeSec = statsTotalSuccess + statsTotalFailed > 0 
    ? ((totalWaitTimeMs / (statsTotalSuccess + statsTotalFailed)) / 1000).toFixed(1) 
    : '0.0';
    
  const avgSignupTimeSec = statsTotalSuccess > 0 
    ? ((totalSignupTimeMs / statsTotalSuccess) / 1000).toFixed(1) 
    : '0.0';

  console.log(`================= [QUEUE STATS] =================`);
  console.log(`- Antrean Menunggu   : ${waitingCount} user`);
  console.log(`- Sedang Diproses    : ${processingCount} user`);
  console.log(`- Berhasil           : ${completedCount} user`);
  console.log(`- Gagal              : ${failedCount} user`);
  console.log(`- Rate Limit (429)   : ${statsTotal429} kali`);
  console.log(`- Rata-rata Menunggu : ${avgWaitTimeSec} detik`);
  console.log(`- Rata-rata Signup   : ${avgSignupTimeSec} detik`);
  console.log(`=================================================`);
}

// Core Queue Processor Worker
async function processQueue() {
  const now = Date.now();

  // Prune completed/failed items older than 5 minutes to prevent memory leaks
  const pruneCompletedLimit = now - 5 * 60 * 1000;
  for (let i = queue.length - 1; i >= 0; i--) {
    const q = queue[i];
    if ((q.status === 'success' || q.status === 'failed') && q.completedAt && q.completedAt < pruneCompletedLimit) {
      queue.splice(i, 1);
    }
  }

  // Prune inactive/abandoned waiting users (no heartbeat in 15 seconds)
  const waitingItems = queue.filter(item => item.status === 'waiting');
  for (const item of waitingItems) {
    if (now - item.lastSeen > 15000) {
      console.log(`[QUEUE] User ${item.email} inactive for >15s. Expiring queue item ${item.id}`);
      const idx = queue.findIndex(q => q.id === item.id);
      if (idx !== -1) {
        queue.splice(idx, 1);
      }
    }
  }

  // Start processing waiting items if we have available concurrent slots
  let activeCount = queue.filter(item => item.status === 'processing').length;
  const sortedWaiting = queue.filter(item => item.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt);

  while (activeCount < MAX_CONCURRENT_SIGNUPS && sortedWaiting.length > 0) {
    const item = sortedWaiting.shift()!;
    item.status = 'processing';
    item.processedAt = Date.now();
    activeCount++;

    console.log(`[QUEUE] Processing queue item ${item.id} for ${item.email}`);
    console.log(`[QUEUE] Processing`);

    // Process this request asynchronously to not block the main event loop
    (async () => {
      try {
        const result = await attemptSignupWithBackoff(item);
        item.status = 'success';
        item.completedAt = Date.now();
        item.result = result;
        
        statsTotalSuccess++;
        if (item.processedAt && item.createdAt) {
          totalWaitTimeMs += (item.processedAt - item.createdAt);
        }
        if (item.completedAt && item.processedAt) {
          totalSignupTimeMs += (item.completedAt - item.processedAt);
        }
        
        console.log(`[QUEUE] Signup success for ${item.email}`);
        console.log(`[QUEUE] Queue completed`);
      } catch (err: any) {
        item.status = 'failed';
        item.completedAt = Date.now();
        
        if (err.message === 'EMAIL_EXISTS') {
          item.error = 'EMAIL_EXISTS';
        } else {
          item.error = err.message || String(err);
        }
        
        statsTotalFailed++;
        if (item.processedAt && item.createdAt) {
          totalWaitTimeMs += (item.processedAt - item.createdAt);
        }
        
        console.error(`[QUEUE] Signup failed for ${item.email} (${item.id}):`, item.error);
      } finally {
        // Securely delete plaintext password from server memory
        delete item.password;
        
        // Print live queue logs
        logQueueStats();
        
        // Trigger queue again to fill the empty slot immediately
        processQueue();
      }
    })();
  }
}

// Attempt Sign Up with Exponential Backoff
async function attemptSignupWithBackoff(queueItem: QueueItem): Promise<{ session: any; user: any }> {
  let attempt = 0;
  const maxRetries = 5;
  let delay = 1000;

  if (!isSupabaseConfigured) {
    throw new Error('Database Cloud tidak terhubung ke server.');
  }

  while (true) {
    try {
      console.log(`[QUEUE] Signup started for ${queueItem.email} (Attempt ${attempt + 1})`);
      
      // Separate isolated client instance to avoid shared auth session issues
      const clientSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
      });

      // 1. Generate unique card_id on the server side
      let uniqueCardId = '';
      let isUnique = false;
      let checkAttempts = 0;
      while (!isUnique && checkAttempts < 10) {
        checkAttempts++;
        uniqueCardId = Math.floor(1000 + Math.random() * 9000).toString();
        const { data } = await clientSupabase
          .from('profiles')
          .select('card_id')
          .eq('card_id', uniqueCardId);
        if (!data || data.length === 0) {
          isUnique = true;
        }
      }

      // 2. Perform Supabase Sign Up
      const { data: authData, error: authError } = await clientSupabase.auth.signUp({
        email: queueItem.email,
        password: queueItem.password || '',
      });

      if (authError) {
        const is429 = authError.status === 429 || 
                     authError.message?.toLowerCase().includes('too many requests') || 
                     String(authError).toLowerCase().includes('429');
                     
        if (is429) {
          statsTotal429++;
          console.log(`[QUEUE] Retry 429 for ${queueItem.email} - Status: 429. Retrying in ${delay}ms...`);
          if (attempt < maxRetries) {
            attempt++;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }
        }
        throw authError;
      }

      if (authData?.user) {
        // 3. Create the profile row
        const { error: profileError } = await clientSupabase
          .from('profiles')
          .upsert([
            {
              id: authData.user.id,
              full_name: queueItem.fullName,
              email: queueItem.email,
              class: queueItem.classField,
              card_id: uniqueCardId,
              role: 'user',
              account_status: 'belum_dikonfirmasi',
              voting_status: 'belum',
              card_visibility: true,
            },
          ]);

        if (profileError) {
          throw profileError;
        }

        return {
          session: authData.session,
          user: authData.user
        };
      }
      throw new Error("Gagal memperoleh data user dari Supabase Auth.");
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      const isEmailRegistered = errorMsg.toLowerCase().includes('already registered') || 
                                errorMsg.toLowerCase().includes('already exists') || 
                                errorMsg.toLowerCase().includes('user already registered') ||
                                (error.status === 400 && errorMsg.toLowerCase().includes('use'));

      if (isEmailRegistered) {
        throw new Error('EMAIL_EXISTS');
      }

      if (attempt >= maxRetries) {
        throw new Error(`Batas limit pendaftaran terlampaui. ${errorMsg}`);
      }
      
      throw error;
    }
  }
}

// Calculate precise dynamic position
function getQueuePosition(id: string) {
  const item = queue.find(q => q.id === id);
  if (!item) return { status: 'not_found', position: -1, peopleAhead: -1 };
  
  if (item.status === 'processing') {
    return { status: 'processing', position: 0, peopleAhead: 0 };
  }
  if (item.status === 'success') {
    return { status: 'success', position: 0, peopleAhead: 0, result: item.result };
  }
  if (item.status === 'failed') {
    return { status: 'failed', position: 0, peopleAhead: 0, error: item.error };
  }

  const waiting = queue.filter(q => q.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt);
  const idx = waiting.findIndex(q => q.id === id);
  
  const pos = idx === -1 ? 1 : idx + 1;
  const ahead = idx === -1 ? 0 : idx;

  return {
    status: 'waiting',
    position: pos,
    peopleAhead: ahead
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Background interval to prune and process queues
  setInterval(() => {
    processQueue();
  }, 2000);

  // API Route: Enqueue User for Sign Up
  app.post('/api/signup/enqueue', async (req, res) => {
    const { email, password, fullName, classField } = req.body;

    if (!email || !password || !fullName || !classField) {
      return res.status(400).json({ error: 'Seluruh kolom pendaftaran harus diisi lengkap.' });
    }

    // Check if user is already waiting/processing with this email
    const existing = queue.find(q => q.email === email && (q.status === 'waiting' || q.status === 'processing'));
    if (existing) {
      existing.lastSeen = Date.now();
      const posInfo = getQueuePosition(existing.id);
      console.log(`[QUEUE] User added - Re-enqueued existing item ${existing.id} for ${email}`);
      console.log(`[QUEUE] Position: ${posInfo.position}`);
      return res.json({ queueId: existing.id, ...posInfo });
    }

    // Create a new queue request
    queueCounter++;
    const queueId = `QUEUE-${queueCounter.toString().padStart(6, '0')}`;
    
    const newItem: QueueItem = {
      id: queueId,
      email,
      password,
      fullName,
      classField,
      status: 'waiting',
      error: null,
      createdAt: Date.now(),
      lastSeen: Date.now()
    };

    queue.push(newItem);
    statsTotalReceived++;

    console.log(`[QUEUE] User added - ${email} registered with ${queueId}`);
    
    const posInfo = getQueuePosition(queueId);
    console.log(`[QUEUE] Position: ${posInfo.position}`);

    // Trigger process queue immediately
    processQueue();

    return res.json({ queueId, ...posInfo });
  });

  // API Route: Check Queue Item Status and Heartbeat
  app.get('/api/signup/status', (req, res) => {
    const { queueId } = req.query;

    if (!queueId || typeof queueId !== 'string') {
      return res.status(400).json({ error: 'Queue ID tidak valid.' });
    }

    const item = queue.find(q => q.id === queueId);
    if (!item) {
      return res.status(404).json({ error: 'Nomor antrean tidak ditemukan atau sudah kedaluwarsa.' });
    }

    // Keep-alive heartbeat
    item.lastSeen = Date.now();

    const statusInfo = getQueuePosition(queueId);
    return res.json(statusInfo);
  });

  // Live Stats for debug/admin visibility
  app.get('/api/signup/stats', (req, res) => {
    const waitingCount = queue.filter(q => q.status === 'waiting').length;
    const processingCount = queue.filter(q => q.status === 'processing').length;
    
    const avgWaitTimeSec = statsTotalSuccess + statsTotalFailed > 0 
      ? ((totalWaitTimeMs / (statsTotalSuccess + statsTotalFailed)) / 1000).toFixed(1) 
      : '0.0';
      
    const avgSignupTimeSec = statsTotalSuccess > 0 
      ? ((totalSignupTimeMs / statsTotalSuccess) / 1000).toFixed(1) 
      : '0.0';

    return res.json({
      waiting: waitingCount,
      processing: processingCount,
      success: statsTotalSuccess,
      failed: statsTotalFailed,
      rateLimit429: statsTotal429,
      avgWaitTimeSec,
      avgSignupTimeSec
    });
  });

  // Vite development integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
