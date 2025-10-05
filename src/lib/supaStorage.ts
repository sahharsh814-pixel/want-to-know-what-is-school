// Supabase-backed localStorage shim with realtime sync
// It transparently persists localStorage keys into public.app_state
// and broadcasts updates via Supabase Realtime so that all tabs/ports
// (e.g., 8080 and 8081) stay in sync.

import { supabase } from './supabaseClient'

type Cache = Record<string, string | null>

const TABLE = 'app_state'

// IMPORTANT: Only isolate teacher/student auth & identity keys from cross-port sync.
// Principal keys are intentionally NOT excluded so Principal dashboard
// content management and quick actions continue to reflect across ports.
const SENSITIVE_PATTERNS: RegExp[] = [
  /^teacherAuth$/i,
  /^studentAuth$/i,
  /^currentStudent$/i,
  /^teacherEmail$/i,
  /^teacherName$/i,
  /^teacherSubject$/i,
  /^studentEmail$/i,
  /^studentName$/i,
  /^payment-redirect-info$/i,
  /^teacher-profile-/i,
  /^student-profile-/i,
  /^theme$/i,
  /^vite-/i
]

function shouldSync(key: string): boolean {
  try {
    return !SENSITIVE_PATTERNS.some((re) => re.test(key))
  } catch {
    return true
  }
}

let cache: Cache = {}
let initialized = false

// Helper to emit a synthetic StorageEvent-like event for listeners
function emitStorageEvent(key: string, newValue: string | null, oldValue: string | null) {
  try {
    const event = new StorageEvent('storage', {
      key,
      newValue,
      oldValue,
      storageArea: window.localStorage,
      url: window.location.href,
    })
    window.dispatchEvent(event)
  } catch {
    // Fallback minimal dispatch
    window.dispatchEvent(new CustomEvent('storage', { detail: { key, newValue, oldValue } }))
  }
}

async function loadAllKeysIntoCache() {
  const { data, error } = await supabase.from(TABLE).select('key, value')
  if (error) {
    console.warn('[supaStorage] initial fetch error', error)
    return
  }
  const next: Cache = {}
  for (const row of data) {
    const k = row.key as string
    if (shouldSync(k)) {
      next[k] = row.value
    }
  }
  cache = next
}

async function upsertKey(key: string, value: string) {
  const { error } = await supabase.from(TABLE).upsert({ key, value }).single()
  if (error) console.warn('[supaStorage] upsert error', key, error)
}

async function deleteKey(key: string) {
  const { error } = await supabase.from(TABLE).delete().eq('key', key)
  if (error) console.warn('[supaStorage] delete error', key, error)
}

function patchLocalStorage() {
  const original = {
    getItem: window.localStorage.getItem.bind(window.localStorage),
    setItem: window.localStorage.setItem.bind(window.localStorage),
    removeItem: window.localStorage.removeItem.bind(window.localStorage),
    clear: window.localStorage.clear.bind(window.localStorage),
  }

  // getItem reads from cache; fall back to original for unknown keys
  window.localStorage.getItem = (key: string): string | null => {
    if (key in cache) return cache[key]
    return original.getItem(key)
  }

  // setItem writes to cache immediately, schedules supabase upsert, and emits event
  window.localStorage.setItem = (key: string, value: string): void => {
    const oldValue = cache[key] ?? original.getItem(key)
    cache[key] = value
    // fire-and-forget network write
    if (shouldSync(key)) {
      void upsertKey(key, value)
    }
    emitStorageEvent(key, value, oldValue ?? null)
  }

  // removeItem deletes from cache, schedules supabase delete, and emits event
  window.localStorage.removeItem = (key: string): void => {
    const oldValue = cache[key] ?? original.getItem(key)
    delete cache[key]
    if (shouldSync(key)) {
      void deleteKey(key)
    }
    emitStorageEvent(key, null, oldValue ?? null)
  }

  // clear removes only cached keys from supabase (non-app keys are left intact)
  window.localStorage.clear = (): void => {
    const keys = Object.keys(cache)
    for (const key of keys) {
      const oldValue = cache[key]
      delete cache[key]
      if (shouldSync(key)) {
        void deleteKey(key)
      }
      emitStorageEvent(key, null, oldValue ?? null)
    }
  }
}

// Track if we're already syncing to prevent infinite loops
let isSyncing = false;

// Override localStorage methods to sync with Supabase
const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
const originalRemoveItem = window.localStorage.removeItem.bind(window.localStorage);

window.localStorage.setItem = function(key: string, value: string) {
  originalSetItem(key, value);
  // Only sync to Supabase if we're not already syncing
  if (!isSyncing) {
    isSyncing = true;
    upsertKey(key, value)
      .catch(err => console.error('Failed to sync to Supabase:', err))
      .finally(() => { isSyncing = false; });
  }
};

window.localStorage.removeItem = function(key: string) {
  originalRemoveItem(key);
  // Only remove from Supabase if we're not already syncing
  if (!isSyncing) {
    isSyncing = true;
    deleteKey(key)
      .catch(err => console.error('Failed to remove from Supabase:', err))
      .finally(() => { isSyncing = false; });
  }
};


function subscribeRealtime() {
  // Subscribe to changes on public.app_state
  supabase
    .channel('app_state_stream')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload: any) => {
        const key = (payload.new?.key ?? payload.old?.key) as string
        if (!key) return
        if (!shouldSync(key)) return
        const oldValue = cache[key] ?? null
        if (payload.eventType === 'DELETE') {
          delete cache[key]
          emitStorageEvent(key, null, oldValue)
        } else {
          const newValue = (payload.new?.value ?? null) as string | null
          cache[key] = newValue
          emitStorageEvent(key, newValue, oldValue)
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // no-op
      }
    })
}

export async function initSupaStorage() {
  if (initialized) return
  initialized = true
  await loadAllKeysIntoCache()
  patchLocalStorage()
  subscribeRealtime()
}