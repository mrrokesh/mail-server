import { useSyncExternalStore } from 'react';

export type DataSource = 'unknown' | 'live' | 'preview';

let source: DataSource = 'unknown';
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function noteSource(next: 'live' | 'preview') {
  if (source === 'preview') return;
  if (next === 'live' && source === 'live') return;
  source = next;
  emit();
}

export function resetSource() {
  source = 'unknown';
  emit();
}

export function useDataSource(): DataSource {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => source,
    () => 'unknown',
  );
}
