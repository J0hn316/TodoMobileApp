import { memo, useRef, useCallback } from 'react';
import type { JSX } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View, StyleSheet, Platform } from 'react-native';
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
import { ROW_HEIGHT, SPACING, cardShadow } from '../theme/layout';

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
    gap: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
    ...cardShadow,
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
  onToggle: (id: string, next: boolean) => void;
  onEdit: (id: string, title: string) => void;
  setOpenRow?: (row: SwipeableMethods | null) => void;
  onDeleteRequest: (id: string, title: string) => void;
  busy?: boolean;
};

const Row = ({
  item,
  colors,
  busy,
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

  const renderLeftActions = useCallback(
    (): JSX.Element => (
      <View style={styles.RenderLeftActionStyles}>
        <Text style={styles.text}>Done</Text>
      </View>
    ),
    []
  );

  const renderRightActions = useCallback(
    (): JSX.Element => (
      <View style={styles.RenderRightActionStyles}>
        <Text style={styles.text}>Delete</Text>
      </View>
    ),
    []
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
          if (dir === 'right') {
            onToggle(item.id, !item.done);
            swipeRef.current?.close();
          }
          if (dir === 'left') {
            onDeleteRequest(item.id, item.title);
            swipeRef.current?.close();
          }
        }}
      >
        <Animated.View style={aStyle}>
          <Pressable
            delayLongPress={150}
            onPress={() => {
              if (!busy) onToggle(item.id, !item.done);
            }}
            onLongPress={() => {
              if (!busy) onEdit(item.id, item.title);
            }}
            onPressOut={() => (scale.value = withSpring(1, { damping: 20 }))}
            onPressIn={() => (scale.value = withSpring(0.98, { damping: 20 }))}
            hitSlop={SPACING.sm}
            android_ripple={
              Platform.OS === 'android'
                ? { color: '#00000014', borderless: false }
                : undefined
            }
            style={[
              styles.PressableStyles,
              {
                borderColor: colors.border,
                backgroundColor: item.done ? '#e5e7eb30' : 'transparent',
                opacity: busy ? 0.55 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            accessibilityState={{ checked: item.done }}
            accessibilityHint="Double tap to toggle. Long press to edit."
            accessibilityActions={[
              {
                name: 'activate',
                label: item.done ? 'Mark incomplete' : 'Mark complete',
              },
              { name: 'longpress', label: 'Edit' },
              { name: 'magicTap', label: 'Delete' },
            ]}
            onAccessibilityAction={({ nativeEvent }) => {
              if (nativeEvent.actionName === 'activate')
                onToggle(item.id, !item.done);
              if (nativeEvent.actionName === 'longpress')
                onEdit(item.id, item.title);
              if (nativeEvent.actionName === 'magicTap')
                onDeleteRequest(item.id, item.title);
            }}
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
                  lineHeight: 20,
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
