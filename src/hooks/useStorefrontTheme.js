import { useMemo } from 'react';
import { useAppTheme } from '@/components/theme/ThemeProvider';
import { resolveStorefrontTheme } from '@/utils/storefrontTheme';

export function useStorefrontTheme(store) {
  const { isDark } = useAppTheme();

  return useMemo(() => resolveStorefrontTheme(store, { isDark }), [store, isDark]);
}

export default useStorefrontTheme;
