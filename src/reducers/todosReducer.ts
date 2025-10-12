import type { Todo } from '../types/models';
import { generateId } from '../utils/id';

export type Action =
  | { type: 'hydrate'; todos: Todo[] }
  | { type: 'add'; title: string }
  | { type: 'toggle'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'edit'; id: string; title: string }
  | { type: 'clearCompleted' };

export const STORAGE_KEY = 'todos:v1';

export const reducer = (state: Todo[], action: Action): Todo[] => {
  switch (action.type) {
    case 'hydrate':
      return action.todos;

    case 'add': {
      const title = action.title.trim();
      if (!title) return state;
      return [
        { id: generateId(), title, done: false, createdAt: Date.now() },
        ...state,
      ];
    }

    case 'toggle':
      return state.map((t) =>
        t.id === action.id ? { ...t, done: !t.done } : t
      );

    case 'remove':
      return state.filter((t) => t.id !== action.id);

    case 'edit': {
      const title = action.title.trim();
      if (!title) return state;
      return state.map((t) => (t.id === action.id ? { ...t, title } : t));
    }

    case 'clearCompleted':
      return state.filter((t) => !t.done);

    default:
      return state;
  }
};
