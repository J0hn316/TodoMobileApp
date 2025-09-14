import type { JSX } from 'react';
import { useTheme } from '@react-navigation/native';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useAppTheme } from '../theme/ThemeProvider';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontSize: 16 },
});

const SettingsScreen = (): JSX.Element => {
  const { colors } = useTheme();
  const { mode, toggle } = useAppTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>⚙️ Settings</Text>

      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.text }]}>Dark Mode</Text>
        <Switch value={mode === 'dark'} onValueChange={toggle} />
      </View>

      <Text style={{ color: colors.text, marginTop: 8 }}>
        Current theme: <Text style={{ fontWeight: '700' }}>{mode}</Text>
      </Text>
    </View>
  );
};

export default SettingsScreen;
