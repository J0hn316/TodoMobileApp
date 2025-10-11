import type { JSX } from 'react';
import { View, Text } from 'react-native';

const EmptyState = ({ color }: { color: string }): JSX.Element => {
  return (
    <View
      style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 24 }}
    >
      <Text style={{ fontSize: 48, marginBottom: 8 }}>🗒️</Text>
      <Text style={{ color, fontWeight: '700', fontSize: 16, marginBottom: 6 }}>
        Nothing here yet
      </Text>
      <Text style={{ color, opacity: 0.75, textAlign: 'center', marginTop: 6 }}>
        Pull down to refresh, or change the filter.
      </Text>
    </View>
  );
};

export default EmptyState;
