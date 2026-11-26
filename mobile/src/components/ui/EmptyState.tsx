import { tokens } from '@mrrokesh/shared';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useType } from '../../theme/type';
import { Button } from './Button';

type Props = {
  icon: ReactNode;
  sentence: string;
  actionLabel: string;
  onAction: () => void;
};

export function EmptyState({ icon, sentence, actionLabel, onAction }: Props) {
  const type = useType();
  return (
    <View
      style={{
        width: '100%',
        alignItems: 'center',
        gap: tokens.space[4],
        paddingVertical: tokens.space[8],
      }}
    >
      {icon}
      <Text style={[type.body, { textAlign: 'center' }]}>{sentence}</Text>
      <View style={{ alignSelf: 'stretch' }}>
        <Button label={actionLabel} onPress={onAction} />
      </View>
    </View>
  );
}
