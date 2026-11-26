import { tokens } from '@mrrokesh/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ApiClientError } from '../src/lib/api';
import { SessionProvider } from '../src/lib/session';
import { useTheme } from '../src/theme/use-theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

export default function RootLayout() {
  const { theme, color } = useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: color.bg },
            headerStyle: { backgroundColor: color.bg },
            headerTintColor: color.textPrimary,
            headerTitleStyle: { fontFamily: tokens.font.headingFamily },
          }}
        />
      </SessionProvider>
    </QueryClientProvider>
  );
}
