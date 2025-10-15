import { useEffect, useState, useMemo } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

import { OfflineQueue } from './offlineQueue';

// const styles = StyleSheet.create({
//   banner: {
//     position: 'absolute',
//     bottom: Platform.OS === 'ios' ? 70 : 50,
//     alignSelf: 'center',
//     backgroundColor: '#2563eb',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 20,
//     shadowColor: '#000',
//     shadowOpacity: 0.25,
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   text: {
//     color: '#fff',
//     fontWeight: '600',
//   },
// });

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
  },
});

type Position = 'top' | 'bottom';

type PositionProps = {
  // default 'bottom'
  position?: Position;
  // extra pixels away from edge (besides safe-area)
  offset?: number;
  // show the spinner emoji
  showIcon?: boolean;
};

const OnlineListener = ({
  position = 'bottom',
  offset = 12,
  showIcon = true,
}: PositionProps) => {
  const insets = useSafeAreaInsets();
  const [syncing, setSyncing] = useState(false);

  // drive the animation with a shared value
  const vis = useSharedValue(0);
  useEffect(() => {
    vis.value = withTiming(syncing ? 1 : 0, { duration: 220 });
  }, [syncing, vis]);

  useEffect(() => {
    // Listen for connectivity and flush when online
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false)
        OfflineQueue.flush();
    });

    const unsubscribeQueue = OfflineQueue.subscribe((que) =>
      setSyncing(que.length > 0)
    );

    return () => {
      unsubscribeNetInfo();
      unsubscribeQueue();
    };
  }, []);

  // Absolute anchor styles for top/bottom + safe area
  const containerStyle = useMemo<StyleProp<ViewStyle>>(
    () => ({
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      ...(position === 'top'
        ? { top: insets.top + offset }
        : { bottom: insets.bottom + offset }),
    }),
    [insets.top, insets.bottom, offset, position]
  );

  // Animated slide + fade
  const aStyle = useAnimatedStyle(() => {
    // slide distance (px)
    const slide = 14;
    const translateY =
      position === 'top'
        ? interpolate(vis.value, [0, 1], [-slide, 0])
        : interpolate(vis.value, [0, 1], [slide, 0]);

    return {
      opacity: vis.value,
      transform: [{ translateY }],
    };
  }, [position]);

  return (
    <View pointerEvents="box-none" style={containerStyle}>
      <Animated.View style={[styles.banner, aStyle]}>
        <Text style={styles.text}>
          {showIcon ? '⏳ ' : ''}
          Syncing offline changes…
        </Text>
      </Animated.View>
    </View>
  );
};

export default OnlineListener;
