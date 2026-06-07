// Pluggable storage backend for the Zustand persist layer.
// Supports three modes the user can switch between in Settings:
//  - memory       : volatile, lost on reload (good for demo / private)
//  - localStorage : default, persists in this browser
//  - remote       : PUT/GET a JSON blob from a self-hosted server
//
// All values are JSON strings (Zustand's createJSONStorage contract).

export type StorageMode = "memory" | "localStorage" | "remote";

export interface StorageConfig {
  mode: StorageMode;
  remoteUrl?: string; // e.g. https://my-server.example.com/state
  remoteToken?: string; // optional bearer token
}

const CONFIG_KEY = "jobs-app-storage-config";

export function loadStorageConfig(): StorageConfig {
  if (typeof window === "undefined") return { mode: "localStorage" };
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw) as StorageConfig;
  } catch {
    /* ignore */
  }
  return { mode: "localStorage" };
}

export function saveStorageConfig(cfg: StorageConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

interface SyncLike {
  getItem: (k: string) => string | null | Promise<string | null>;
  setItem: (k: string, v: string) => void | Promise<void>;
  removeItem: (k: string) => void | Promise<void>;
}

const memoryStore = new Map<string, string>();

const memoryAdapter: SyncLike = {
  getItem: (k) => memoryStore.get(k) ?? null,
  setItem: (k, v) => {
    memoryStore.set(k, v);
  },
  removeItem: (k) => {
    memoryStore.delete(k);
  },
};

const localAdapter: SyncLike = {
  getItem: (k) => (typeof window === "undefined" ? null : window.localStorage.getItem(k)),
  setItem: (k, v) => {
    if (typeof window !== "undefined") window.localStorage.setItem(k, v);
  },
  removeItem: (k) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(k);
  },
};

function remoteAdapter(cfg: StorageConfig): SyncLike {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cfg.remoteToken) headers["authorization"] = `Bearer ${cfg.remoteToken}`;
  const url = (k: string) => `${(cfg.remoteUrl || "").replace(/\/$/, "")}/${encodeURIComponent(k)}`;
  return {
    async getItem(k) {
      if (!cfg.remoteUrl) return null;
      try {
        const r = await fetch(url(k), { headers });
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`GET ${r.status}`);
        return await r.text();
      } catch (e) {
        console.warn("[remote storage] getItem failed, falling back to localStorage", e);
        return localAdapter.getItem(k) as string | null;
      }
    },
    async setItem(k, v) {
      // Always mirror into localStorage so the user has an offline copy.
      localAdapter.setItem(k, v);
      if (!cfg.remoteUrl) return;
      try {
        await fetch(url(k), { method: "PUT", headers, body: v });
      } catch (e) {
        console.warn("[remote storage] setItem failed", e);
      }
    },
    async removeItem(k) {
      localAdapter.removeItem(k);
      if (!cfg.remoteUrl) return;
      try {
        await fetch(url(k), { method: "DELETE", headers });
      } catch {
        /* ignore */
      }
    },
  };
}

export function getActiveStorage(): SyncLike {
  const cfg = loadStorageConfig();
  if (cfg.mode === "memory") return memoryAdapter;
  if (cfg.mode === "remote") return remoteAdapter(cfg);
  return localAdapter;
}
