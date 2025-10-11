import type { JSX } from 'react';
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from './src/theme/ThemeProvider';
import RootNavigator from './src/navigation/RootNavigator';
import { SnackbarProvider } from './src/providers/SnackbarProvider';

const queryClient = new QueryClient();

const App = (): JSX.Element => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <SnackbarProvider>
            <RootNavigator />
          </SnackbarProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

export default App;
