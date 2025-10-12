import type { JSX } from 'react';
import { useEffect } from 'react';
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import OnlineListener from './src/utils/OnlineListener';
import { OfflineQueue } from './src/utils/offlineQueue';
import { ThemeProvider } from './src/theme/ThemeProvider';
import RootNavigator from './src/navigation/RootNavigator';
import { SnackbarProvider } from './src/providers/SnackbarProvider';

const queryClient = new QueryClient();

const AppRoot = (): JSX.Element => {
  useEffect(() => {
    (async () => {
      await OfflineQueue.load();
      // try an initial flush in case there are pending actions from a prior run
      OfflineQueue.flush();
    })();
  }, []);

  return (
    <>
      <RootNavigator />
      <OnlineListener />
    </>
  );
};

const App = (): JSX.Element => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <SnackbarProvider>
            <AppRoot />
          </SnackbarProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

export default App;
