import type { Todo } from '../types/models';

const BASE = 'https://jsonplaceholder.typicode.com';

// Map remote -> local shape (remote has userId/completed)
const toLocal = (r: any): Todo => {
  return {
    id: String(r.id),
    title: r.title ?? '',
    note: undefined,
    done: !!r.completed,
    createdAt: Date.now(),
  };
};

export const fetchTodos = async (): Promise<Todo[]> => {
  const res = await fetch(`${BASE}/todos?_limit=10`);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

  const data = await res.json();
  return (data as any[]).map(toLocal);
};

export const createTodo = async (title: string): Promise<Todo> => {
  const res = await fetch(`${BASE}/todos`, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify({ title, completed: false, userId: 1 }),
  });

  const data = await res.json();
  // emulate server id if missing
  data.id ??= Math.floor(Math.random() * 100000);
  return toLocal(data);
};

export const updateTodo = async (
  id: string,
  patch: Partial<Todo>
): Promise<Todo> => {
  const res = await fetch(`${BASE}/todos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: patch.title, completed: patch.done }),
  });

  const data = await res.json();
  data.id = id;
  return toLocal(data);
};

export const deleteTodo = async (id: string): Promise<{ ok: true }> => {
  const res = await fetch(`${BASE}/todos/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Delete failed');
  return { ok: true };
};
