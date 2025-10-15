import { describe, it, expect } from 'vitest';
import type { Todo } from '../types/models';
import { reducer, type Action } from '../reducers/todosReducer';

// helper to make a todo with sane defaults, easily overridden
const mk = (partial: Partial<Todo> = {}): Todo => ({
  id: 't1',
  title: 'Alpha',
  done: false,
  createdAt: 1,
  ...partial,
});

describe('todosReducer', () => {
  it('hydrates by replacing state (not merging)', () => {
    const initial: Todo[] = [mk({ id: 'old' })];
    const incoming: Todo[] = [mk({ id: '1' }), mk({ id: '2', title: 'B' })];

    const next = reducer(initial, { type: 'hydrate', todos: incoming });
    expect(next).toHaveLength(2);
    expect(next[0].id).toBe('1');
    // not the same reference as either initial or incoming arrays
    expect(next).not.toBe(initial);
    expect(next).not.toBe(incoming);
  });

  it('adds a trimmed todo at the top; ignores empty/whitespace-only', () => {
    const s0: Todo[] = [mk({ id: 'x', title: 'Existing' })];

    // empty → no change (same reference)
    const s1 = reducer(s0, { type: 'add', title: '   ' });
    expect(s1).toBe(s0);

    // non-empty (trimmed) → prepended
    const s2 = reducer(s0, { type: 'add', title: '  New   ' });
    expect(s2).toHaveLength(2);
    expect(s2[0].title).toBe('New');
    expect(typeof s2[0].id).toBe('string');
    expect(typeof s2[0].createdAt).toBe('number');
    // original second item preserved
    expect(s2[1]).toBe(s0[0]);
  });

  it('toggles one item by id and preserves other references', () => {
    const a = mk({ id: 'a', done: false });
    const b = mk({ id: 'b', done: true });
    const s0: Todo[] = [a, b];

    const s1 = reducer(s0, { type: 'toggle', id: 'a' });
    expect(s1).not.toBe(s0);
    // a changed
    expect(s1[0]).not.toBe(a);
    expect(s1[0].done).toBe(true);
    // b unchanged object identity
    expect(s1[1]).toBe(b);

    const s2 = reducer(s1, { type: 'toggle', id: 'b' });
    expect(s2[1].done).toBe(false);
  });

  it('edits title (trimmed); ignores empty/whitespace-only edits', () => {
    const a = mk({ id: '1', title: 'Old' });
    const s0: Todo[] = [a];

    // ignore empty → same reference
    const s1 = reducer(s0, { type: 'edit', id: '1', title: '   ' });
    expect(s1).toBe(s0);

    // valid edit → new object for the edited item only
    const s2 = reducer(s0, { type: 'edit', id: '1', title: '  New  ' });
    expect(s2).not.toBe(s0);
    expect(s2[0].title).toBe('New');
    expect(s2[0]).not.toBe(a);
  });

  it('removes by id', () => {
    const s0: Todo[] = [mk({ id: '1' }), mk({ id: '2' })];
    const s1 = reducer(s0, { type: 'remove', id: '2' });
    expect(s1).toHaveLength(1);
    expect(s1[0].id).toBe('1');
  });

  it('clears only completed items', () => {
    const s0: Todo[] = [
      mk({ id: '1', done: true }),
      mk({ id: '2', done: false }),
      mk({ id: '3', done: true }),
    ];
    const s1 = reducer(s0, { type: 'clearCompleted' });
    expect(s1).toHaveLength(1);
    expect(s1[0].id).toBe('2');
    expect(s1[0].done).toBe(false);
  });

  it('returns same state for unknown action types', () => {
    const s0: Todo[] = [mk({ id: '1' })];
    // force-cast a nonsense action to ensure default branch returns input
    const s1 = reducer(s0, { type: 'noop' } as unknown as Action);
    expect(s1).toBe(s0);
  });
});
