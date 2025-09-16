import { memo } from 'react';
import type { JSX } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';

import type { Todo } from '../types/models';

export type TodoRowProps = {
  item: Todo;
  colors: { text: string; border: string };
  onToggle: (id: string) => void;
  onEdit: (id: string, title: string) => void;
  onDeleteRequest: (id: string, title: string) => void;
};

const ActionChip = ({
  label,
  bg,
}: {
  label: string;
  bg: string;
}): JSX.Element => {
  return (
    <View
      style={{
        width: 96,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: bg,
        height: '100%',
        borderRadius: 10,
      }}
    >
      <Text style={{ color: 'white', fontWeight: '800' }}>{label}</Text>
    </View>
  );
};

const Row = ({
  item,
  colors,
  onToggle,
  onDeleteRequest,
  onEdit,
}: TodoRowProps): JSX.Element => {
  const renderLeftActions = (): JSX.Element => (
    <ActionChip
      label={item.done ? 'UNDO' : 'DONE'}
      bg={item.done ? '#6b7280' : '#16a34a'}
    />
  );

  const renderRightActions = (): JSX.Element => (
    <ActionChip label="DELETE" bg="#ef4444" />
  );

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(16)}
      exiting={FadeOutUp.springify().damping(16)}
      layout={LinearTransition.springify().damping(16)}
    >
      <ReanimatedSwipeable
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        overshootRight={false}
        overshootLeft={false}
        onSwipeableOpen={(dir: 'left' | 'right') => {
          if (dir === 'left') onToggle(item.id);
          if (dir === 'right') onDeleteRequest(item.id, item.title);
        }}
      >
        <Pressable
          onPress={() => onToggle(item.id)}
          onLongPress={() => onEdit(item.id, item.title)}
          style={{
            borderWidth: 1,
            borderRadius: 10,
            padding: 12,
            gap: 8,
            borderColor: colors.border,
            backgroundColor: item.done ? '#e5e7eb30' : 'transparent',
            flexDirection: 'row',
            alignItems: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel={`Todo ${item.title} ${
            item.done ? 'completed' : 'active'
          }`}
        >
          <Ionicons
            name={item.done ? 'checkbox' : 'square-outline'}
            size={22}
            color={item.done ? '#16a34a' : colors.text}
            style={{ marginRight: 4 }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.text,
                textDecorationLine: item.done ? 'line-through' : 'none',
                opacity: item.done ? 0.7 : 1,
              }}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text style={{ color: colors.text, opacity: 0.6, fontSize: 12 }}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </View>
        </Pressable>
      </ReanimatedSwipeable>
    </Animated.View>
  );
};

export default memo(Row);
