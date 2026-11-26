import type { LucideIcon } from 'lucide-react';

export function Icon({ icon: Glyph }: { icon: LucideIcon }) {
  return <Glyph size={24} strokeWidth={1.5} aria-hidden="true" />;
}
