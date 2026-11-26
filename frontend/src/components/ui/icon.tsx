import type { LucideIcon } from 'lucide-react';

export function Icon({ icon: Glyph, size = 24 }: { icon: LucideIcon; size?: number }) {
  return <Glyph size={size} strokeWidth={1.5} aria-hidden="true" />;
}
