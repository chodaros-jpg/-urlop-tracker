import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

const TABLE = "urlop_storage";

// Same interface the app already uses (window.storage.get / set / delete),
// but data lives in Supabase, so clearing browser data does not delete it.
export function createCloudStorage(userId, onError) {
  return {
    async get(key) {
      const { data, error } = await supabase
        .from(TABLE)
        .select("value")
        .eq("user_id", userId)
        .eq("key", key)
        .maybeSingle();
      if (error) { onError?.(error); throw error; }

      if (data?.value) return { key, value: data.value };

      // First run on Supabase: move old browser data up, if any is left.
      const local = localStorage.getItem(key);
      if (local) {
        await this.set(key, local);
        return { key, value: local };
      }
      return null;
    },

    async set(key, value) {
      const { error } = await supabase
        .from(TABLE)
        .upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() });
      if (error) { onError?.(error); throw error; }
      onError?.(null);
      return { key, value };
    },

    async delete(key) {
      const { error } = await supabase.from(TABLE).delete().eq("user_id", userId).eq("key", key);
      if (error) { onError?.(error); throw error; }
      return { key, deleted: true };
    },
  };
}
