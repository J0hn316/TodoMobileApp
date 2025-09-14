import type { JSX } from 'react';
import { useTheme } from '@react-navigation/native';
import { View, Text, Button, StyleSheet } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList, MainTabParamList } from '../types/navigation';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
});

type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const HomeScreen = ({ navigation }: HomeScreenProps): JSX.Element => {
  const { colors } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>🏠 Home</Text>
      <Button
        title="Go to Profile (JohnDoe)"
        onPress={() => navigation.navigate('Profile', { username: 'JohnDoe' })}
      />
    </View>
  );
};

export default HomeScreen;
