import { describe, it, expect } from 'vitest';
import type { Todo } from '../types/models';
import { reducer, type Action } from '../reducers/todosReducer';

const mk = (partial: Partial<Todo>): Todo => ({
  id: 't1',
  title: 'Alpha',
  done: false,
  createdAt: 1,
  ...partial,
});

describe('todos reducer', () => {
  it('hydrates state', () => {
    const todos: Todo[] = [mk({ id: '1' }), mk({ id: '2', title: 'B' })];
    const next = reducer([], { type: 'hydrate', todos });
    expect(next).toHaveLength(2);
    expect(next[0].id).toBe('1');
  });

  it('adds a trimmed todo at the top; ignores empty', () => {
    const s0: Todo[] = [mk({ id: 'x', title: 'Existing' })];

    // empty → no change
    const s1 = reducer(s0, { type: 'add', title: '   ' });
    expect(s1).toBe(s0); // same reference (no change)

    // non-empty (trimmed)
    const s2 = reducer(s0, { type: 'add', title: '  New   ' });
    expect(s2).toHaveLength(2);
    expect(s2[0].title).toBe('New');
    expect(typeof s2[0].id).toBe('string');
    expect(s2[0].done).toBe(false);
    expect(typeof s2[0].createdAt).toBe('number');
  });

  it('toggles one item by id', () => {
    const s0: Todo[] = [mk({ id: 'a' }), mk({ id: 'b', done: true })];
    const s1 = reducer(s0, { type: 'toggle', id: 'a' });
    expect(s1[0].done).toBe(true);
    expect(s1[1].done).toBe(true);
    const s2 = reducer(s1, { type: 'toggle', id: 'b' });
    expect(s2[1].done).toBe(false);
  });

  it('edits title (trimmed); ignores empty/whitespace-only', () => {
    const s0: Todo[] = [mk({ id: '1', title: 'Old' })];

    // ignore empty
    const s1 = reducer(s0, { type: 'edit', id: '1', title: '   ' });
    expect(s1).toBe(s0);

    // valid edit
    const s2 = reducer(s0, { type: 'edit', id: '1', title: '  New  ' });
    expect(s2[0].title).toBe('New');
  });

  it('removes by id', () => {
    const s0: Todo[] = [mk({ id: '1' }), mk({ id: '2' })];
    const s1 = reducer(s0, { type: 'remove', id: '2' });
    expect(s1).toHaveLength(1);
    expect(s1[0].id).toBe('1');
  });

  it('clears completed only', () => {
    const s0: Todo[] = [
      mk({ id: '1', done: true }),
      mk({ id: '2', done: false }),
      mk({ id: '3', done: true }),
    ];
    const s1 = reducer(s0, { type: 'clearCompleted' });
    expect(s1).toEqual([mk({ id: '2', done: false })]);
  });

  it('returns same state for unknown action', () => {
    const s0: Todo[] = [mk({ id: '1' })];
    const s1 = reducer(s0, { type: 'noop' } as unknown as Action);
    expect(s1).toBe(s0);
  });
});
