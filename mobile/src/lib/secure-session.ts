import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'mrrokesh.accessToken';
const REFRESH_KEY = 'mrrokesh.refreshToken';
const MODE_KEY = 'mrrokesh.sessionMode';
const EMAIL_KEY = 'mrrokesh.accountEmail';

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export type SessionMode = 'live' | 'preview';

export type StoredSession = {
  accessToken: string;
  refreshToken: string;
  mode: SessionMode;
  email: string | null;
};

/**
 * Memory map used only when Expo SecureStore is unavailable (web).
 * Device builds write the access and refresh tokens to the keychain.
 */
const memory = new Map<string, string>();
let nativeAvailable: boolean | null = null;
const clearedListeners = new Set<() => void>();

async function canUseSecureStore(): Promise<boolean> {
  if (nativeAvailable !== null) return nativeAvailable;
  try {
    nativeAvailable = await SecureStore.isAvailableAsync();
  } catch {
    nativeAvailable = false;
  }
  return nativeAvailable;
}

async function setItem(key: string, value: string): Promise<void> {
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(key, value, secureOptions);
    return;
  }
  memory.set(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (await canUseSecureStore()) {
    return SecureStore.getItemAsync(key, secureOptions);
  }
  return memory.get(key) ?? null;
}

async function deleteItem(key: string): Promise<void> {
  if (await canUseSecureStore()) {
    await SecureStore.deleteItemAsync(key, secureOptions);
    return;
  }
  memory.delete(key);
}

export function onStoredSessionCleared(listener: () => void): () => void {
  clearedListeners.add(listener);
  return () => {
    clearedListeners.delete(listener);
  };
}

export async function readStoredSession(): Promise<StoredSession | null> {
  const mode = await getItem(MODE_KEY);
  const accessToken = await getItem(ACCESS_KEY);
  const refreshToken = await getItem(REFRESH_KEY);
  const email = await getItem(EMAIL_KEY);
  if ((mode !== 'live' && mode !== 'preview') || !accessToken || !refreshToken) {
    return null;
  }
  return { accessToken, refreshToken, mode, email };
}

export async function writeStoredSession(session: StoredSession): Promise<void> {
  await setItem(MODE_KEY, session.mode);
  await setItem(ACCESS_KEY, session.accessToken);
  await setItem(REFRESH_KEY, session.refreshToken);
  if (session.email) {
    await setItem(EMAIL_KEY, session.email);
    return;
  }
  await deleteItem(EMAIL_KEY);
}

export async function clearStoredSession(): Promise<void> {
  await deleteItem(MODE_KEY);
  await deleteItem(ACCESS_KEY);
  await deleteItem(REFRESH_KEY);
  await deleteItem(EMAIL_KEY);
  for (const listener of clearedListeners) listener();
}
