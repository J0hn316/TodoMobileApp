import type { Todo } from '../types/models';

export const normalizeTodos = (list: any[]): Todo[] =>
  (list ?? []).map((todo) => ({
    ...todo,
    id: String((todo as any).id),
  }));
