import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';

const brandSchema = z.object({
  productName: z.string().min(1),
  logoUrl: z.string().nullable(),
  accentToken: z.literal('brand'),
});

const fallback = {
  productName: 'MR Rokesh',
  logoUrl: null as string | null,
  accentToken: 'brand' as const,
};

export function useLoginBrand() {
  const [params] = useSearchParams();
  const host = params.get('brandHost') || window.location.hostname;
  const query = useQuery({
    queryKey: ['public-brand', host],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/v1/public/brand?host=${encodeURIComponent(host)}`, {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) return fallback;
        const parsed = brandSchema.safeParse(await response.json());
        return parsed.success ? parsed.data : fallback;
      } catch {
        return fallback;
      }
    },
  });
  return query.data ?? fallback;
}
