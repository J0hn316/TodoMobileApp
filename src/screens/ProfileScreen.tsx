import type { JSX } from 'react';
import { useTheme } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types/navigation';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: { fontSize: 22, fontWeight: '700' },
});

type ProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const ProfileScreen = ({ route }: ProfileScreenProps): JSX.Element => {
  const { colors } = useTheme();
  const { username } = route.params;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        👤 Profile: {username}
      </Text>
    </View>
  );
};

export default ProfileScreen;
