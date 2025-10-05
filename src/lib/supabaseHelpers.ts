// Helper functions for Supabase operations
import { supabase } from './supabaseClient';

/**
 * Get data from Supabase app_state table
 * Falls back to localStorage if Supabase fails
 */
export async function getSupabaseData<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      console.warn(`[Supabase] Error fetching ${key}:`, error.message);
      // Fallback to localStorage
      const localData = localStorage.getItem(key);
      return localData ? JSON.parse(localData) : defaultValue;
    }

    if (data && data.value) {
      const parsedData = JSON.parse(data.value);
      // Also sync to localStorage for offline access
      localStorage.setItem(key, data.value);
      return parsedData;
    }

    // If no data in Supabase, check localStorage
    const localData = localStorage.getItem(key);
    return localData ? JSON.parse(localData) : defaultValue;
  } catch (err) {
    console.error(`[Supabase] Exception fetching ${key}:`, err);
    // Fallback to localStorage
    const localData = localStorage.getItem(key);
    return localData ? JSON.parse(localData) : defaultValue;
  }
}

/**
 * Save data to both Supabase and localStorage
 */
export async function setSupabaseData<T>(key: string, value: T): Promise<boolean> {
  try {
    const jsonValue = JSON.stringify(value);
    
    // Save to localStorage first (immediate)
    localStorage.setItem(key, jsonValue);

    // Then save to Supabase
    const { error } = await supabase
      .from('app_state')
      .upsert({
        key,
        value: jsonValue,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.warn(`[Supabase] Error saving ${key}:`, error.message);
      return false;
    }

    console.log(`[Supabase] Successfully saved ${key}`);
    return true;
  } catch (err) {
    console.error(`[Supabase] Exception saving ${key}:`, err);
    return false;
  }
}

/**
 * Delete data from both Supabase and localStorage
 */
export async function deleteSupabaseData(key: string): Promise<boolean> {
  try {
    // Remove from localStorage
    localStorage.removeItem(key);

    // Remove from Supabase
    const { error } = await supabase
      .from('app_state')
      .delete()
      .eq('key', key);

    if (error) {
      console.warn(`[Supabase] Error deleting ${key}:`, error.message);
      return false;
    }

    console.log(`[Supabase] Successfully deleted ${key}`);
    return true;
  } catch (err) {
    console.error(`[Supabase] Exception deleting ${key}:`, err);
    return false;
  }
}

/**
 * Get a value from Supabase app_state table
 */
export async function getSupabaseValue<T>(key: string): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('value')
      .eq('key', key)
      .limit(1);

    if (error) {
      console.error(`[Supabase] Error fetching ${key}:`, error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return JSON.parse(data[0].value);
  } catch (err) {
    console.error(`[Supabase] Error parsing ${key}:`, err);
    return null;
  }
}

/**
 * Subscribe to realtime changes for a specific key
 */
export function subscribeToSupabaseChanges<T>(
  key: string,
  callback: (newValue: T) => void
) {
  const channel = supabase
    .channel(`app_state_${key}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_state',
        filter: `key=eq.${key}`
      },
      (payload: any) => {
        console.log(`[Supabase] Realtime update for ${key}:`, payload);
        if (payload.new && payload.new.value) {
          try {
            const parsedValue = JSON.parse(payload.new.value);
            // Update localStorage
            localStorage.setItem(key, payload.new.value);
            callback(parsedValue);
          } catch (err) {
            console.error(`[Supabase] Error parsing realtime update:`, err);
          }
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}
