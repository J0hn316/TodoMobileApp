// src/test/offlineQueue.test.ts
import { describe, it, beforeEach, expect, vi, type Mock } from 'vitest';

// ---- Mock AsyncStorage with an in-memory store (simple stub) ----
vi.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    default: {
      getItem: vi.fn(async (k: string) => store[k] ?? null),
      setItem: vi.fn(async (k: string, v: string) => {
        store[k] = v;
      }),
      removeItem: vi.fn(async (k: string) => {
        delete store[k];
      }),
      // test-only helper
      __reset: () => {
        store = {};
      },
    },
  };
});

// ---- Mock API layer *inside* vi.mock factory (so it’s hoisted) ----
vi.mock('../api/todos', () => ({
  createTodo: vi.fn(async (_title: string) => ({ id: 's1' })),
  updateTodo: vi.fn(async (_id: string, _patch: any) => ({ ok: true })),
  deleteTodo: vi.fn(async (_id: string) => ({ ok: true })),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineQueue } from '../utils/offlineQueue';
// Import the mocked fns so we can assert calls:
import { createTodo, updateTodo, deleteTodo } from '../api/todos';

// Drive setTimeout with fake timers (for backoff)
vi.useFakeTimers();

describe('OfflineQueue', () => {
  beforeEach(async () => {
    // reset storage + spies + queue between tests
    (AsyncStorage as any).__reset?.();
    vi.clearAllMocks();
    await OfflineQueue.clear();
    await OfflineQueue.load();
  });

  it('loads empty initially', () => {
    expect(OfflineQueue.peek()).toEqual([]);
  });

  it('enqueues and persists', async () => {
    const item = await OfflineQueue.enqueue({
      type: 'add',
      title: 'A',
      clientId: 'c1',
    });
    expect(item.type).toBe('add');
    expect(typeof item.qid).toBe('string');

    // in-memory
    const q = OfflineQueue.peek();
    expect(q).toHaveLength(1);
    // @ts-expect-error union has title on 'add' items
    expect(q[0].title).toBe('A');

    // persisted
    const raw = await AsyncStorage.getItem('offlineQueue:v1');
    expect(raw).toBeTruthy();
  });

  it('flush calls API in order and dequeues on success', async () => {
    await OfflineQueue.enqueue({ type: 'add', title: 'A', clientId: 'c1' });
    await OfflineQueue.enqueue({ type: 'toggle', id: '1', next: true });
    await OfflineQueue.enqueue({ type: 'edit', id: '1', title: 'B' });
    await OfflineQueue.enqueue({ type: 'delete', id: '2' });

    await OfflineQueue.flush();

    expect(createTodo).toHaveBeenCalledWith('A');
    expect(updateTodo).toHaveBeenCalledWith('1', { done: true });
    expect(updateTodo).toHaveBeenCalledWith('1', { title: 'B' });
    expect(deleteTodo).toHaveBeenCalledWith('2');

    expect(OfflineQueue.peek()).toHaveLength(0);
  });

  it('transient failure keeps item and increments attempts, then backs off', async () => {
    // First create fails once (simulate offline)
    (createTodo as Mock).mockRejectedValueOnce(new Error('Network error'));

    await OfflineQueue.enqueue({ type: 'add', title: 'X', clientId: 'c1' });
    const q0 = OfflineQueue.peek();
    expect(q0[0].attempts).toBe(0);

    // Kick off flush; it will schedule a backoff sleep
    const p = OfflineQueue.flush();
    await vi.advanceTimersByTimeAsync(1000); // > 250 * 2^1
    await p;

    const q1 = OfflineQueue.peek();
    expect(q1).toHaveLength(1);
    expect(q1[0].type).toBe('add');
    expect(q1[0].attempts).toBe(1);
  });

  it('subscribe/unsubscribe fires on changes', async () => {
    const fn = vi.fn();
    const unsub = OfflineQueue.subscribe(fn);

    await OfflineQueue.enqueue({ type: 'add', title: 'S', clientId: 'c9' });
    expect(fn).toHaveBeenCalled();

    unsub();
    const callsBefore = fn.mock.calls.length;
    await OfflineQueue.enqueue({ type: 'add', title: 'T', clientId: 'c10' });
    expect(fn.mock.calls.length).toBe(callsBefore); // unchanged after unsubscribe
  });
});
