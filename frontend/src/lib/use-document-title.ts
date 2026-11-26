import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title === 'MR Rokesh Mail' ? title : `${title} · MR Rokesh Mail`;
  }, [title]);
}

export function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/mail';
  }
  return value;
}
