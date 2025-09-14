import type { JSX } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  NavigationContainer,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';

import { useAppTheme } from '../theme/ThemeProvider';
import type { MainTabParamList, RootStackParamList } from '../types/navigation';

import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TodosListScreen from '../screens/TodosListScreen';

const Tabs = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const MainTabs = (): JSX.Element => {
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const onBack = () => {
        // if Tabs is focused and we're on the first tab, exit app
        const state = navigation.getState();
        const tabIndex = state?.routes?.find((r) => r.name === 'MainTabs')
          ? state.index
          : 0;

        if (tabIndex === 0) {
          BackHandler.exitApp();
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [navigation])
  );

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabel: route.name,
        tabBarIcon: ({ color, size, focused }) => {
          let name: keyof typeof Ionicons.glyphMap = 'home';
          // pick an icon based on the route
          if (route.name === 'Home') name = focused ? 'home' : 'home-outline';
          if (route.name === 'Settings')
            name = focused ? 'settings' : 'settings-outline';
          if (route.name === 'Todos') name = focused ? 'list' : 'list-outline';
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Todos" component={TodosListScreen} />
      <Tabs.Screen name="Settings" component={SettingsScreen} />
    </Tabs.Navigator>
  );
};

const RootNavigator = (): JSX.Element => {
  const { navTheme } = useAppTheme();
  const isDark = navTheme.dark;

  const headerOptions = useMemo(
    () => ({
      headerStyle: { backgroundColor: isDark ? '#111827' : '#f3f4f6' },
      headerTintColor: isDark ? '#f9fafb' : '#111827',
    }),
    [isDark]
  );

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={headerOptions}>
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ title: 'My App' }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={({ route }) => ({
            title: route.params?.username
              ? `${route.params.username}'s Profile`
              : 'Profile',
          })}
        />
      </Stack.Navigator>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
};

export default RootNavigator;
