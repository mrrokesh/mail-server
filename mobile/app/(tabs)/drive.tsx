import { tokens } from '@mrrokesh/shared';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { HardDrive } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { z } from 'zod';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Screen } from '../../src/components/ui/Screen';
import { apiRequest } from '../../src/lib/api';
import { useSession } from '../../src/lib/session';
import { useTheme } from '../../src/theme/use-theme';
import { useType } from '../../src/theme/type';

const filesSchema = z.object({
  files: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      sizeBytes: z.number(),
    }),
  ),
});

export default function DriveScreen() {
  const router = useRouter();
  const { color } = useTheme();
  const type = useType();
  const { status } = useSession();
  const files = useQuery({
    queryKey: ['drive', 'files', status],
    enabled: status === 'signedIn',
    queryFn: () => apiRequest('/api/v1/drive/files', filesSchema, { auth: true }),
  });

  if (status !== 'signedIn') {
    return (
      <Screen scroll edges={['top']}>
        <EmptyState
          icon={
            <HardDrive
              color={color.textSecondary}
              size={tokens.icon.size}
              strokeWidth={tokens.icon.strokeWidth}
            />
          }
          sentence="Sign in to the API to see Drive."
          actionLabel="Open Mail"
          onAction={() => router.navigate('/(tabs)/mail')}
        />
      </Screen>
    );
  }

  const rows = files.data?.files ?? [];

  return (
    <Screen scroll edges={['top']}>
      <View style={{ gap: tokens.space[4], paddingHorizontal: tokens.layout.gutterMobile }}>
        <Text accessibilityRole="header" style={type.h2}>
          Drive
        </Text>
        {files.isPending ? <Text style={type.body}>Loading files.</Text> : null}
        {files.isError ? <Text style={type.body}>Drive could not be loaded.</Text> : null}
        {files.isSuccess && rows.length === 0 ? (
          <Text style={type.body}>No files yet. Add one from the web app.</Text>
        ) : null}
        {rows.map((file) => (
          <View key={file.id} style={{ gap: tokens.space[1] }}>
            <Text style={type.body}>{file.name}</Text>
            <Text style={type.caption}>{file.sizeBytes} bytes</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
