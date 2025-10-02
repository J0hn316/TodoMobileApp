import type { JSX } from 'react';
import * as Haptics from 'expo-haptics';
import { useTheme, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useIsFetching } from '@tanstack/react-query';
import {
  useEffect,
  useReducer,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import {
  View,
  Text,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  ActionSheetIOS,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';

import { generateId } from '../utils/id';

import applyRowLayout from '../theme/rowLayout';

import type { Todo } from '../types/models';

import { useSnackbar } from '../providers/SnackbarProvider';

import TodoRow from '../components/TodoRow';
import EmptyState from '../components/EmptyState';
import TodoForm, { TodoFormValues } from '../components/TodoForm';

import { FlashList, type ListRenderItemInfo } from '../libs/flashlist';

import { fetchTodos, createTodo, updateTodo, deleteTodo } from '../api/todos';
import { normalizeTodos } from '../utils/normalize';

type Action =
  | { type: 'clearCompleted' }
  | { type: 'add'; title: string }
  | { type: 'toggle'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'hydrate'; todos: Todo[] }
  | { type: 'edit'; id: string; title: string };

type Filter = 'all' | 'active' | 'completed';

const STORAGE_KEY = 'todos:v1';

const reducer = (state: Todo[], action: Action): Todo[] => {
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

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  list: { marginTop: 12 },
  countAndSpinner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  filterBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 520,
  },
  SwipeBtn: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  SwipeArea: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    maxWidth: 360,
  },
  SwipeText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
});

const TodosListScreen = (): JSX.Element => {
  const { colors } = useTheme();
  const { enqueue } = useSnackbar();

  const hydratedFromRemote = useRef(false);
  const [todos, dispatch] = useReducer(reducer, []);

  const todosRef = useRef<Todo[]>(todos);
  useEffect(() => {
    todosRef.current = todos;
  }, [todos]);

  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  const total = todos.length;
  const completed = todos.filter((todo) => todo.done).length;
  const active = total - completed;
  const isFetchingAny = useIsFetching({ queryKey: ['todos'] }) > 0;

  const HINT_KEY = 'todos:swipeHintShown';

  const openRowRef = useRef<SwipeableMethods | null>(null);

  const setOpenRow = (row: SwipeableMethods | null) => {
    if (openRowRef.current && openRowRef.current !== row) {
      try {
        openRowRef.current.close();
      } catch {}
    }
    openRowRef.current = row;
  };

  // Load on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw)
          dispatch({ type: 'hydrate', todos: JSON.parse(raw) as Todo[] });
      } catch {}
    })();
  }, []);

  // Save on change
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(todos)).catch(() => {});
  }, [todos]);

  // One-time swipe hint
  useEffect(() => {
    (async () => {
      try {
        const hint = await AsyncStorage.getItem(HINT_KEY);
        // never shown
        if (!hint) setShowSwipeHint(true);
      } catch {}
    })();
  }, []);

  const markHintSeen = async (): Promise<void> => {
    setShowSwipeHint(false);
    try {
      await AsyncStorage.setItem(HINT_KEY, '1');
    } catch {}
  };

  // Remote fetch + hydrate (first time) with React Query
  const { data, refetch, isSuccess } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  });

  // when remote data arrives the first time AND local list is empty, hydrate reducer
  useEffect(() => {
    if (
      !hydratedFromRemote.current &&
      isSuccess &&
      data &&
      data.length > 0 &&
      todos.length === 0
    ) {
      dispatch({ type: 'hydrate', todos: data });
      hydratedFromRemote.current = true;
    }
  }, [isSuccess, data, todos.length]);

  // Refetch on screen focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = (): void => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  };

  const addBusy = (id: string): void =>
    setBusyIds((s) => new Set(s).add(String(id)));
  const removeBusy = (id: string): void =>
    setBusyIds((s) => {
      const next = new Set(s);
      next.delete(String(id));
      return next;
    });

  // Undo helper
  const undoDeleteNow = (deleted: Todo, index: number): void => {
    const current = todosRef.current;
    const restored = [...current];
    const safeIndex = Math.max(0, Math.min(index, restored.length));
    restored.splice(safeIndex, 0, deleted);

    dispatch({ type: 'hydrate', todos: restored });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
  };

  // Optimistic mutations
  const addMut = useMutation({
    mutationFn: (title: string) => createTodo(title),
    onMutate: async (title) => {
      const optimistic = {
        id: generateId(),
        title,
        done: false,
        createdAt: Date.now(),
      };
      const prev = todosRef.current;
      dispatch({ type: 'hydrate', todos: [optimistic, ...prev] });
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      ctx?.prev && dispatch({ type: 'hydrate', todos: ctx.prev });
      enqueue({
        kind: 'error',
        message: (err as Error)?.message ?? 'Add failed',
      });
    },
    onSuccess: () => enqueue({ kind: 'success', message: 'Todo added' }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) =>
      updateTodo(id, { done: next }),
    onMutate: async ({ id }) => {
      addBusy(id);
      const prev = todosRef.current;
      dispatch({ type: 'toggle', id });
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      ctx?.prev && dispatch({ type: 'hydrate', todos: ctx.prev });
      enqueue({
        kind: 'error',
        message: (err as Error)?.message ?? 'Update failed',
      });
    },
    onSettled: (_data, _err, vars) => removeBusy(vars.id),
  });

  const editMut = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateTodo(id, { title }),
    onMutate: async ({ id, title }) => {
      addBusy(id);
      const prev = todosRef.current;
      dispatch({
        type: 'edit',
        id,
        title,
      });
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      ctx?.prev && dispatch({ type: 'hydrate', todos: ctx.prev });
      enqueue({
        kind: 'error',
        message: (err as Error)?.message ?? 'Save failed',
      });
    },
    onSuccess: () => enqueue({ kind: 'success', message: 'Saved' }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteTodo(id),
    onMutate: async (id) => {
      addBusy(id);
      const prev = todosRef.current;
      dispatch({ type: 'remove', id });
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      ctx?.prev && dispatch({ type: 'hydrate', todos: ctx.prev });
      enqueue({
        kind: 'error',
        message: (err as Error)?.message ?? 'Delete failed',
      });
    },
    onSuccess: () => enqueue({ kind: 'success', message: 'Deleted' }),
  });

  // Handlers using mutations
  const onAdd = (title: string): void => {
    if (addMut.isPending) return;
    addMut.mutate(title);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const onToggle = (id: string, next: boolean): void => {
    if (toggleMut.isPending) return;
    toggleMut.mutate({ id, next });
    Haptics.selectionAsync().catch(() => {});
  };

  const onEditSubmit = (id: string, title: string): void => {
    if (editMut.isPending) return;
    editMut.mutate({ id, title });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
  };

  const onDelete = (id: string): void => {
    if (delMut.isPending) return;
    delMut.mutate(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => {}
    );
  };

  // Derived + memoized
  const filtered = useMemo(
    () =>
      todos.filter((todo) =>
        filter === 'all' ? true : filter === 'active' ? !todo.done : todo.done
      ),
    [todos, filter]
  );

  const handleToggle = useCallback((id: string, next: boolean): void => {
    onToggle(id, next);
  }, []);

  const handleEdit = useCallback(
    (id: string, title: string): void => startEdit(id, title),
    []
  );

  const handleDeleteRequest = useCallback(
    (id: string, title: string): void => confirmDelete(id, title),
    []
  );

  // Local helpers
  const startEdit = (id: string, currentTitle: string): void => {
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setEditingTitle('');
  };

  const confirmDelete = (id: string, title: string): void => {
    const doDelete = (): void => {
      try {
        openRowRef.current?.close();
      } catch {}
      // find in latest list
      const idx = todosRef.current.findIndex(
        (todo) => String(todo.id) === String(id)
      );
      const deleted = todosRef.current.find(
        (todo) => String(todo.id) === String(id)
      );

      onDelete(id);
      if (idx >= 0 && deleted) {
        enqueue({
          kind: 'info',
          message: `Deleted “${deleted.title}”`,
          actionLabel: 'UNDO',
          durationMs: 5000,
          onAction: () => undoDeleteNow(deleted, idx),
        });
      }
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: `Delete "${title}"?`,
          options: ['Cancel', 'Delete'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (i) => i === 1 && doDelete()
      );
    } else {
      Alert.alert('Delete?', `"${title}"`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>📝 Todos</Text>

        {/* Add row */}
        <View style={{ marginTop: 12 }}>
          <TodoForm
            mode="add"
            colors={colors as any}
            loading={addMut.isPending}
            submitLabel={addMut.isPending ? 'Adding…' : 'Add'}
            onSubmit={({ title }: TodoFormValues) => onAdd(title)}
          />
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          {(['all', 'active', 'completed'] as Filter[]).map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => {
                  setFilter(f);
                  Haptics.selectionAsync().catch(() => {});
                }}
                style={[
                  styles.filterBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: active
                      ? colors.primary ?? '#2563eb'
                      : 'transparent',
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? '#fff' : colors.text,
                    fontWeight: active ? '700' : '500',
                  }}
                >
                  {f[0].toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => dispatch({ type: 'clearCompleted' })}
            style={[styles.filterBtn, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.text }}>Clear Completed</Text>
          </Pressable>
        </View>

        {/* Counts + spinner */}
        <View style={styles.countAndSpinner}>
          <Text style={{ color: colors.text, opacity: 0.8 }}>
            {active} active • {completed} completed • {total} total
          </Text>
          {isFetchingAny ? <ActivityIndicator /> : null}
        </View>

        {/* List */}
        <FlashList
          style={styles.list}
          data={filtered}
          keyExtractor={(t: Todo) => t.id}
          overrideItemLayout={applyRowLayout as any}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={<EmptyState color={colors.text} />}
          renderItem={({ item }: ListRenderItemInfo<Todo>) => (
            <TodoRow
              item={item}
              colors={colors as any}
              busy={busyIds.has(item.id)}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDeleteRequest={handleDeleteRequest}
              setOpenRow={setOpenRow}
              onAnySwipeStart={markHintSeen}
            />
          )}
        />

        {/* Edit modal */}
        <Modal
          visible={!!editingId}
          transparent
          animationType="slide"
          onRequestClose={cancelEdit}
          statusBarTranslucent
        >
          <View style={styles.modalBackdrop} pointerEvents="box-none">
            <View
              style={[
                styles.modalCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Edit Todo
              </Text>

              <TodoForm
                key={editingId ?? 'edit'}
                mode="edit"
                colors={colors as any}
                onCancel={cancelEdit}
                defaultValues={{ title: editingTitle }}
                onSubmit={({ title }) => {
                  if (!editingId) return;
                  onEditSubmit(editingId, title);
                  setEditingId(null);
                  setEditingTitle('');
                }}
                loading={editMut.isPending}
                submitLabel={editMut.isPending ? 'Saving...' : 'Save'}
              />
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

export default TodosListScreen;
