import type { JSX } from 'react';
import * as Haptics from 'expo-haptics';
import { useTheme, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useIsFetching } from '@tanstack/react-query';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import {
  useEffect,
  useReducer,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  Modal,
  Platform,
  StyleSheet,
  AccessibilityInfo,
  KeyboardAvoidingView,
} from 'react-native';

import { generateId } from '../utils/id';
import { OfflineQueue } from '../utils/offlineQueue';

import { SPACING } from '../theme/layout';
import applyRowLayout from '../theme/rowLayout';

import type { Todo } from '../types/models';

import { reducer, STORAGE_KEY } from '../reducers/todosReducer';

import { useSnackbar } from '../providers/SnackbarProvider';

import TodoRow from '../components/TodoRow';
import CountsBar from '../components/CountsBar';
import EmptyState from '../components/EmptyState';
import FilterChip from '../components/FilterChip';
import ConfirmDialog from '../components/ConfirmDialog';
import TodoForm, { TodoFormValues } from '../components/TodoForm';

import { FlashList, type ListRenderItemInfo } from '../libs/flashlist';

import { fetchTodos, createTodo, updateTodo, deleteTodo } from '../api/todos';

type Filter = 'all' | 'active' | 'completed';

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.md,
  },
  list: { marginTop: SPACING.md },
  countAndSpinner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: SPACING.md,
  },
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
  const [confirm, setConfirm] = useState<{
    visible: boolean;
    id: string | null;
    title: string;
    index: number;
    deleted?: Todo | null;
    loading: boolean;
  }>({
    visible: false,
    id: null,
    title: '',
    index: -1,
    deleted: null,
    loading: false,
  });

  const total = todos.length;
  const completed = todos.filter((todo) => todo.done).length;
  const active = total - completed;
  const isFetchingAny = useIsFetching({ queryKey: ['todos'] }) > 0;

  const HINT_KEY = 'todos:swipeHintShown';

  const openRowRef = useRef<SwipeableMethods | null>(null);

  const setOpenRow = (row: SwipeableMethods | null): void => {
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
  const { data, refetch, isSuccess, dataUpdatedAt } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  });

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

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
      return { prev, optimisticId: optimistic.id };
    },
    onError: async (err, title, ctx) => {
      // Instead of rollback, keep the optimistic row and queue the server action
      await OfflineQueue.enqueue({
        type: 'add',
        title,
        clientId: ctx?.optimisticId ?? generateId(),
      });
      enqueue({ type: 'warning', message: 'Offline: will sync when online' });
    },
    onSuccess: () => enqueue({ type: 'success', message: 'Todo added' }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) =>
      updateTodo(id, { done: next }),
    onMutate: async ({ id }) => {
      addBusy(id);
      const prev = todosRef.current;
      dispatch({ type: 'toggle', id });
      return { prev, id };
    },
    onError: async (err, vars, ctx) => {
      // Keep the optimistic state; queue the change
      await OfflineQueue.enqueue({
        type: 'toggle',
        id: ctx?.id ?? vars.id,
        next: vars.next,
      });
      enqueue({ type: 'warning', message: 'Offline: change queued' });
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
      return { prev, id, title };
    },
    onError: async (err, vars, ctx) => {
      await OfflineQueue.enqueue({
        type: 'edit',
        id: ctx?.id ?? vars.id,
        title: ctx?.title ?? vars.title,
      });
      enqueue({ type: 'warning', message: 'Offline: change queued' });
    },
    onSuccess: () => enqueue({ type: 'success', message: 'Saved' }),
    onSettled: (_data, _err, vars) => removeBusy(vars.id),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteTodo(id),
    onMutate: async (id) => {
      addBusy(id);
      const prev = todosRef.current;
      dispatch({ type: 'remove', id });
      return { prev, id };
    },
    onError: async (err, id, ctx) => {
      await OfflineQueue.enqueue({ type: 'delete', id: ctx?.id ?? id });
      enqueue({ type: 'warning', message: 'Offline: deletion queued' });
    },
    onSuccess: () => enqueue({ type: 'success', message: 'Deleted' }),
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
    const idx = todosRef.current.findIndex((todo) => todo.id === id);
    const deleted = todosRef.current.find((todo) => todo.id === id) ?? null;

    setConfirm({
      visible: true,
      id,
      title,
      index: idx,
      deleted,
      loading: false,
    });
  };

  const closeConfirm = (): void =>
    setConfirm((c) => ({ ...c, visible: false, loading: false }));

  const confirmDeleteNow = async (): Promise<void> => {
    if (!confirm.id) return;
    setConfirm((c) => ({ ...c, loading: true }));

    try {
      // optimistic remove already happens in delMut.onMutate
      await delMut.mutateAsync(confirm.id);

      // enqueue undo snackbar with captured deleted + index (if still available)
      if (confirm.deleted && confirm.index >= 0) {
        enqueue({
          type: 'info',
          message: `Deleted “${confirm.deleted.title}”`,
          actionLabel: 'UNDO',
          durationMs: 5000,
          onAction: () => undoDeleteNow(confirm.deleted!, confirm.index),
        });
      }
      closeConfirm();
    } catch (err) {
      // onError in mutation will already revert state & show error snackbar
      closeConfirm();
    }
  };

  // Derived + memoized
  const filtered = useMemo(
    () =>
      todos.filter((todo) =>
        filter === 'all' ? true : filter === 'active' ? !todo.done : todo.done
      ),
    [todos, filter]
  );

  useEffect(() => {
    if (editingId) {
      AccessibilityInfo.announceForAccessibility?.('Edit todo');
    }
  }, [editingId]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>📝 Todos</Text>

        {/* Add row */}
        <View style={{ marginTop: SPACING.md }}>
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
          {(['all', 'active', 'completed'] as Filter[]).map((f) => (
            <FilterChip
              key={f}
              label={f[0].toUpperCase() + f.slice(1)}
              selected={filter === f}
              onPress={() => {
                setFilter(f);
                Haptics.selectionAsync().catch(() => {});
              }}
              borderColor={colors.border}
              selectedBg={(colors as any).primary ?? '#2563eb'}
              textColor={colors.text}
            />
          ))}
          <FilterChip
            key="clear"
            label="Clear Completed"
            selected={false}
            onPress={() => dispatch({ type: 'clearCompleted' })}
            borderColor={colors.border}
            textColor={colors.text}
          />
        </View>

        {/* Counts + spinner */}
        <CountsBar
          active={active}
          completed={completed}
          total={total}
          colors={colors as any}
          isFetchingAny={isFetchingAny}
        />

        {lastUpdated ? (
          <Text style={{ marginTop: 4, color: colors.text, opacity: 0.6 }}>
            Last updated at {lastUpdated}
          </Text>
        ) : null}

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

        {/* Confirm dialog */}
        <ConfirmDialog
          visible={confirm.visible}
          title={`Delete "${confirm.title}"?`}
          message="This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          loading={confirm.loading}
          onConfirm={confirmDeleteNow}
          onCancel={closeConfirm}
          colors={colors as any}
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
