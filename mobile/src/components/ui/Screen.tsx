import { tokens } from '@mrrokesh/shared';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/use-theme';

type Edge = 'top' | 'bottom';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
};

export function Screen({ children, scroll = false, edges = ['top'] }: Props) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const paddingTop = (edges.includes('top') ? insets.top : 0) + tokens.space[6];
  const paddingBottom = (edges.includes('bottom') ? insets.bottom : 0) + tokens.space[6];

  if (scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop,
            paddingBottom,
            paddingHorizontal: tokens.layout.gutterMobile,
          }}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: color.bg,
        paddingTop,
        paddingBottom,
        paddingHorizontal: tokens.layout.gutterMobile,
      }}
    >
      {children}
    </View>
  );
}
