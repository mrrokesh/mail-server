import { Platform } from 'react-native';

/**
 * Android emulators reach the host machine at 10.0.2.2.
 * iOS Simulator can use 127.0.0.1. A physical device needs EXPO_PUBLIC_API_URL.
 */
function defaultApiUrl(): string {
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  return 'http://127.0.0.1:4000';
}

export function apiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim().replace(/\/$/, '');
  }
  return defaultApiUrl();
}
