import type { JSX } from 'react';
import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

type Kind = 'info' | 'success' | 'error';

export type SnackbarItem = {
  id: string;
  kind: Kind;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: { flex: 1, fontSize: 14, fontWeight: '500' },
  action: { color: '#2563eb', fontWeight: '800' },
});

const Snackbar = ({
  item,
  onClose,
}: {
  item: SnackbarItem;
  onClose: () => void;
}): JSX.Element => {
  const { kind, message, actionLabel, onAction, durationMs = 3000 } = item;

  useEffect(() => {
    const time = setTimeout(onClose, durationMs);
    return () => clearTimeout(time);
  }, [durationMs, onClose]);

  const bg =
    kind === 'error' ? '#fee2e2' : kind === 'success' ? '#dcfce7' : '#e5e7eb';
  const fg =
    kind === 'error' ? '#991b1b' : kind === 'success' ? '#166534' : '#111827';
  const border =
    kind === 'error' ? '#fecaca' : kind === 'success' ? '#bbf7d0' : '#d1d5db';

  return (
    <View style={[styles.wrap]}>
      <View style={[styles.card, { backgroundColor: bg, borderColor: border }]}>
        <Text style={[styles.text, { color: fg }]} numberOfLines={3}>
          {message}
        </Text>
        {actionLabel && (
          <Pressable
            onPress={() => {
              onAction?.();
              onClose();
            }}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

export default Snackbar;
