import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTodo, updateTodo, deleteTodo } from '../api/todos';

const STORAGE_KEY = 'offlineQueue:v1';

type QueueTypes =
  | { type: 'add'; title: string; clientId: string } // clientId = optimistic id
  | { type: 'toggle'; id: string; next: boolean }
  | { type: 'edit'; id: string; title: string }
  | { type: 'delete'; id: string };

export type QueuedAction = QueueTypes & {
  qid: string;
  attempts: number;
  enqueuedAt: number;
};

// Minimal event system so UI can react to queue changes
type Listener = (que: QueuedAction[]) => void;

const listeners = new Set<Listener>();

const notify = (que: QueuedAction[]): void => {
  listeners.forEach((fn) => {
    try {
      fn(que);
    } catch {}
  });
};

// In-memory state mirrors storage
let queue: QueuedAction[] = [];
let flushing = false;

const save = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {}
};

const load = async (): Promise<QueuedAction[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    queue = raw ? (JSON.parse(raw) as QueuedAction[]) : [];
  } catch {
    queue = [];
  }
  notify(queue);
  return queue;
};

const clear = async (): Promise<void> => {
  queue = [];
  await AsyncStorage.removeItem(STORAGE_KEY);
  notify(queue);
};

const genId = (): string =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/**
 * Add a new action to the queue.
 * Returns the queued object so the caller can correlate if needed.
 */
const enqueue = async (action: QueueTypes) => {
  const item: QueuedAction = {
    ...action,
    qid: genId(),
    attempts: 0,
    enqueuedAt: Date.now(),
  };
  queue.push(item);
  await save();
  notify(queue);
  return item;
};

/**
 * Remove a queued action (by qid)
 */
const dequeue = async (qid: string): Promise<void> => {
  queue = queue.filter((a) => a.qid !== qid);
  await save();
  notify(queue);
};

/**
 * Small helper to sleep; used for backoff between attempts
 */
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * A very light exponential backoff (capped)
 */
const backoffMs = (attempts: number) =>
  Math.min(3000, 250 * Math.pow(2, attempts));

/**
 * Try to send ONE action to the server using your API functions.
 * If success, return true. If a permanent failure (e.g., 4xx), drop it and return true.
 * If a transient failure (offline/5xx), return false so we retry later.
 *
 * NOTE: We DO NOT mutate UI state here. UI already did optimistic updates.
 */

const trySend = async (item: QueuedAction): Promise<boolean> => {
  try {
    switch (item.type) {
      case 'add': {
        await createTodo(item.title);
        return true;
      }
      case 'toggle': {
        await updateTodo(item.id, { done: item.next });
        return true;
      }
      case 'edit': {
        await updateTodo(item.id, { title: item.title });
        return true;
      }
      case 'delete': {
        await deleteTodo(item.id);
        return true;
      }
      default:
        return true;
    }
  } catch (err: any) {
    const msg = String(err?.message ?? '');
    const permanent = /4\d\d|Invalid|Bad Request|not found/i.test(msg);
    return permanent ? true : false;
  }
};

/**
 * Flush the entire queue in sequence.
 * - Skips if already flushing
 * - Retries items with capped exponential backoff
 * - Stops early if a transient failure occurs (likely offline)
 */
const flush = async (): Promise<void> => {
  if (flushing) return;
  flushing = true;

  try {
    let i = 0;
    while (i < queue.length) {
      const item = queue[i];
      const ok = await trySend(item);

      if (ok) {
        // sent or dropped => remove from queue
        await dequeue(item.qid);
      } else {
        // transient failure => increase attempts, backoff & stop flush loop early
        item.attempts += 1;
        await save();
        await sleep(backoffMs(item.attempts));
        break; // exit; we'll try again later (on connectivity, next tick, etc.)
      }
    }
  } finally {
    flushing = false;
  }
};

/**
 * Subscribe to queue changes (for UI badges, etc.)
 */
const subscribe = (fn: Listener) => {
  listeners.add(fn);
  // immediate call with current state
  try {
    fn(queue);
  } catch {}
  return () => listeners.delete(fn);
};

/**
 * Test/diagnostics helper: return a shallow copy of the queue.
 * Safe for production (read-only).
 */
const peek = () => queue.slice();

export const OfflineQueue = {
  peek,
  load,
  clear,
  enqueue,
  dequeue,
  flush,
  subscribe,
};
