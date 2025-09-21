import { memo, useRef } from 'react';
import type { JSX } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import type { Todo } from '../types/models';

const styles = StyleSheet.create({
  ActionChipStyles: {
    width: 96,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    borderRadius: 10,
  },
  label: {
    color: 'white',
    fontWeight: '800',
  },
  PressableStyles: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  RenderLeftActionStyles: {
    flex: 1,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    paddingLeft: 20,
    borderRadius: 10,
  },
  text: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
  },
  RenderRightActionStyles: {
    flex: 1,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    borderRadius: 10,
  },
});

export type TodoRowProps = {
  item: Todo;
  colors: { text: string; border: string };
  onAnySwipeStart?: () => void;
  onToggle: (id: string) => void;
  onEdit: (id: string, title: string) => void;
  setOpenRow?: (row: SwipeableMethods | null) => void;
  onDeleteRequest: (id: string, title: string) => void;
};

const Row = ({
  item,
  colors,
  onEdit,
  onToggle,
  setOpenRow,
  onAnySwipeStart,
  onDeleteRequest,
}: TodoRowProps): JSX.Element => {
  const swipeRef = useRef<SwipeableMethods | null>(null);

  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const renderLeftActions = (): JSX.Element => (
    <View style={styles.RenderLeftActionStyles}>
      <Text style={styles.text}>Done</Text>
    </View>
  );

  const renderRightActions = (): JSX.Element => (
    <View style={styles.RenderRightActionStyles}>
      <Text style={styles.text}>Delete</Text>
    </View>
  );

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(16)}
      exiting={FadeOutUp.springify().damping(16)}
      layout={LinearTransition.springify().damping(16)}
    >
      <ReanimatedSwipeable
        ref={swipeRef}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        overshootRight={false}
        overshootLeft={false}
        leftThreshold={48}
        rightThreshold={72}
        onSwipeableWillOpen={() => {
          setOpenRow?.(swipeRef.current);
          onAnySwipeStart?.();
        }}
        onSwipeableWillClose={() => setOpenRow?.(null)}
        onSwipeableOpen={(dir: 'left' | 'right') => {
          if (dir === 'right') onToggle(item.id);
          if (dir === 'left') onDeleteRequest(item.id, item.title);
        }}
      >
        <Animated.View style={aStyle}>
          <Pressable
            delayLongPress={150}
            onPress={() => onToggle(item.id)}
            onLongPress={() => onEdit(item.id, item.title)}
            onPressOut={() => (scale.value = withSpring(1, { damping: 20 }))}
            onPressIn={() => (scale.value = withSpring(0.98, { damping: 20 }))}
            style={[
              styles.PressableStyles,
              {
                borderColor: colors.border,
                backgroundColor: item.done ? '#e5e7eb30' : 'transparent',
              },
            ]}
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
        </Animated.View>
      </ReanimatedSwipeable>
    </Animated.View>
  );
};

export default memo(Row);
