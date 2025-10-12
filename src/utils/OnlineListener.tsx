import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { View, Text, StyleSheet, Platform } from 'react-native';

import { OfflineQueue } from './offlineQueue';

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 70 : 50,
    alignSelf: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
  },
});

const OnlineListener = () => {
  const [syncing, setSyncing] = useState(false);

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

  if (!syncing) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>⏳ Syncing offline changes...</Text>
    </View>
  );
};

export default OnlineListener;
