import { useMemo } from 'react';
import { frameDocument, sanitizeEmailHtml } from '../../lib/email-html';
import { useTheme } from '../../lib/theme';

export function MessageFrame({ html, allowImages }: { html: string; allowImages: boolean }) {
  const theme = useTheme();
  const srcDoc = useMemo(() => {
    const clean = sanitizeEmailHtml(html, allowImages);
    return frameDocument(clean.html, theme);
  }, [allowImages, html, theme]);

  return (
    <iframe
      className="message-frame"
      title="Message"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={srcDoc}
      onLoad={(event) => {
        const doc = event.currentTarget.contentDocument;
        if (!doc) return;
        const height = doc.body.scrollHeight;
        event.currentTarget.style.height = `${height}px`;
      }}
    />
  );
}

export function blockedImageCount(html: string): number {
  return sanitizeEmailHtml(html, false).blockedImages;
}
