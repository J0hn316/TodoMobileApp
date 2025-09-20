import type { JSX } from 'react';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@react-navigation/native';
import { useEffect, useReducer, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  Alert,
  Modal,
  Button,
  FlatList,
  Platform,
  Pressable,
  TextInput,
  StyleSheet,
  ActionSheetIOS,
} from 'react-native';

import { generateId } from '../utils/id';
import type { Todo } from '../types/models';
import TodoRow from '../components/TodoRow';
import TodoForm, { TodoFormValues } from '../components/TodoForm';

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
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    lineHeight: 20,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  inputFlex: {
    flex: 1,
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
  item: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 6 },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  const [todos, dispatch] = useReducer(reducer, []);
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ todo: Todo; index: number } | null>(null);

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

  const filtered = todos.filter((todo) =>
    filter === 'all' ? true : filter === 'active' ? !todo.done : todo.done
  );

  const startEdit = (id: string, currentTitle: string): void => {
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const saveEdit = (): void => {
    if (!editingId) return;
    if (!editingTitle.trim()) {
      Alert.alert('Required', 'Title cannot be empty.');
      return;
    }
    dispatch({ type: 'edit', id: editingId, title: editingTitle });
    setEditingId(null);
    setEditingTitle('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setEditingTitle('');
  };

  const onRefresh = (): void => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  const confirmDelete = (id: string, title: string): void => {
    const doDelete = () => {
      const idx = todos.findIndex((t) => t.id === id);
      const deleted = todos.find((t) => t.id === id);
      if (!deleted) return;
      dispatch({ type: 'remove', id });
      setUndo({ todo: deleted, index: idx });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
        () => {}
      );
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

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>📝 Todos</Text>

      {/* Add row */}
      <View style={{ marginTop: 12 }}>
        <TodoForm
          mode="add"
          colors={colors as any}
          onSubmit={({ title }: TodoFormValues) => {
            dispatch({ type: 'add', title });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
              () => {}
            );
          }}
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

      {/* List */}
      <FlatList
        style={{ marginTop: 12 }}
        data={filtered}
        keyExtractor={(t) => t.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <Text
            style={{
              color: colors.text,
              opacity: 0.7,
              textAlign: 'center',
              marginTop: 20,
            }}
          >
            No todos here — try a different filter or add one above.
          </Text>
        }
        renderItem={({ item }) => (
          <TodoRow
            item={item}
            colors={colors as any}
            onToggle={(id) => {
              dispatch({ type: 'toggle', id });
              Haptics.selectionAsync().catch(() => {});
            }}
            onEdit={(id, title) => startEdit(id, title)}
            onDeleteRequest={(id, title) => confirmDelete(id, title)}
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
                dispatch({ type: 'edit', id: editingId, title });
                setEditingId(null);
                setEditingTitle('');
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                ).catch(() => {});
              }}
            />
            <View
              style={[
                styles.row,
                { marginTop: 12, justifyContent: 'flex-end' },
              ]}
            >
              <Button title="Cancel" onPress={cancelEdit} />
              <View style={{ width: 12 }} />
              <Button title="Save" onPress={saveEdit} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Undo snackbar */}
      {undo && (
        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 24,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
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
  );
};

export default TodosListScreen;
