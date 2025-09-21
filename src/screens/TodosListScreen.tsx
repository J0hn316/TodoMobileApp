import type { JSX } from 'react';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@react-navigation/native';
import { useEffect, useReducer, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useIsFetching } from '@tanstack/react-query';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import {
  View,
  Text,
  Alert,
  Modal,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  ActionSheetIOS,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';

import { generateId } from '../utils/id';
import type { Todo } from '../types/models';
import TodoRow from '../components/TodoRow';
import EmptyState from '../components/EmptyState';
import TodoForm, { TodoFormValues } from '../components/TodoForm';
import { fetchTodos, createTodo, updateTodo, deleteTodo } from '../api/todos';

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
  modalTitle: { fontSize: 18, fontWeight: '700' },
  UndoSnackBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

const TodosListScreen = (): JSX.Element => {
  const { colors } = useTheme();
  const hydratedFromRemote = useRef(false);

  const [todos, dispatch] = useReducer(reducer, []);
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ todo: Todo; index: number } | null>(null);

  const total = todos.length;
  const completed = todos.filter((todo) => todo.done).length;
  const active = total - completed;
  const isFetchingAny = useIsFetching({ queryKey: ['todos'] }) > 0;

  const openRowRef = useRef<SwipeableMethods | null>(null);

  const setOpenRow = (row: SwipeableMethods | null) => {
    if (openRowRef.current && openRowRef.current !== row) {
      try {
        openRowRef.current.close();
      } catch {}
    }
    openRowRef.current = row;
  };

  try {
    openRowRef.current?.close();
  } catch {}

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

  const onRefresh = (): void => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
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
      const prev = todos;
      dispatch({ type: 'hydrate', todos: [optimistic, ...todos] });
      return { prev };
    },
    onError: (_err, _vars, ctx) =>
      ctx?.prev && dispatch({ type: 'hydrate', todos: ctx.prev }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) =>
      updateTodo(id, { done: next }),
    onMutate: async ({ id, next }) => {
      const prev = todos;
      dispatch({
        type: 'hydrate',
        todos: todos.map((t) => (t.id === id ? { ...t, done: next } : t)),
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) =>
      ctx?.prev && dispatch({ type: 'hydrate', todos: ctx.prev }),
  });

  const editMut = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateTodo(id, { title }),
    onMutate: async ({ id, title }) => {
      const prev = todos;
      dispatch({
        type: 'hydrate',
        todos: todos.map((t) => (t.id === id ? { ...t, title } : t)),
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) =>
      ctx?.prev && dispatch({ type: 'hydrate', todos: ctx.prev }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteTodo(id),
    onMutate: async (id) => {
      const prev = todos;
      dispatch({ type: 'hydrate', todos: todos.filter((t) => t.id !== id) });
      return { prev };
    },
    onError: (_err, _vars, ctx) =>
      ctx?.prev && dispatch({ type: 'hydrate', todos: ctx.prev }),
  });

  // Handlers using mutations
  const onAdd = (title: string): void => {
    addMut.mutate(title);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const onToggle = (id: string, next: boolean): void => {
    toggleMut.mutate({ id, next });
    Haptics.selectionAsync().catch(() => {});
  };

  const onEditSubmit = (id: string, title: string): void => {
    editMut.mutate({ id, title });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
  };

  const onDelete = (id: string): void => {
    delMut.mutate(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => {}
    );
  };

  // Local helpers
  const filtered = todos.filter((todo) =>
    filter === 'all' ? true : filter === 'active' ? !todo.done : todo.done
  );

  const startEdit = (id: string, currentTitle: string): void => {
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setEditingTitle('');
  };

  const confirmDelete = (id: string, title: string): void => {
    const doDelete = () => {
      // close an open row (prevents stuck gestures)
      try {
        openRowRef.current?.close();
      } catch {}

      const idx = todos.findIndex((t) => t.id === id);
      const deleted = todos.find((t) => t.id === id);

      if (!deleted) return;
      onDelete(id);
      setUndo({ todo: deleted, index: idx });
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

  const undoDelete = (): void => {
    if (!undo) return;
    const { todo, index } = undo;
    const restored = [...todos];
    restored.splice(index, 0, todo);
    dispatch({ type: 'hydrate', todos: restored });
    setUndo(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
  };

  // Undo auto-dismiss after 5s
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(t);
  }, [undo]);

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
                onPress={() => setFilter(f)}
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
        <FlatList
          style={styles.list}
          data={filtered}
          keyExtractor={(t) => t.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={<EmptyState color={colors.text} />}
          renderItem={({ item }) => (
            <TodoRow
              item={item}
              colors={colors as any}
              onToggle={(id) =>
                onToggle(id, !todos.find((todo) => todo.id === id)?.done)
              }
              onEdit={(id, title) => startEdit(id, title)}
              onDeleteRequest={(id, title) => confirmDelete(id, title)}
              setOpenRow={setOpenRow}
            />
          )}
          contentContainerStyle={{ paddingBottom: 16 }}
        />

        {/* Edit modal */}
        <Modal
          visible={!!editingId}
          transparent
          animationType="slide"
          onRequestClose={cancelEdit}
        >
          <View style={styles.modalBackdrop}>
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
                mode="edit"
                colors={colors as any}
                onCancel={cancelEdit}
                onSubmit={({ title }) => {
                  if (!editingId) return;
                  onEditSubmit(editingId, title);
                  setEditingId(null);
                  setEditingTitle('');
                }}
              />
            </View>
          </View>
        </Modal>

        {/* Undo snackbar */}
        {undo && (
          <View
            style={[
              styles.UndoSnackBar,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
            accessibilityLiveRegion="polite"
          >
            <Text style={{ color: colors.text }} numberOfLines={1}>
              Deleted “{undo.todo.title}”
            </Text>
            <Pressable
              onPress={undoDelete}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={{ color: '#2563eb', fontWeight: '700' }}>UNDO</Text>
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

export default TodosListScreen;
