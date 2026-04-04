import { alpha, useComputedColorScheme, useMantineTheme } from '@mantine/core'
import { useMemo } from 'react'
import type { CSSProperties } from 'react'

export function useLoginBackdropStyle(): CSSProperties {
  const theme = useMantineTheme()
  const colorScheme = useComputedColorScheme('light')

  return useMemo(() => {
    const { brand } = theme.colors
    if (colorScheme === 'dark') {
      return {
        minHeight: '100dvh',
        backgroundColor: theme.colors.dark[8],
        backgroundImage: `
          radial-gradient(ellipse 110% 75% at 100% -5%, ${alpha(brand[4], 0.32)} 0%, transparent 52%),
          radial-gradient(ellipse 90% 60% at -5% 105%, ${alpha(brand[8], 0.22)} 0%, transparent 48%),
          linear-gradient(168deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 45%, ${theme.colors.dark[9]} 100%)
        `,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      }
    }
    return {
      minHeight: '100dvh',
      backgroundColor: theme.colors.gray[0],
      backgroundImage: `
        radial-gradient(ellipse 105% 70% at 92% -8%, ${alpha(brand[2], 0.55)} 0%, transparent 50%),
        radial-gradient(ellipse 85% 55% at -8% 102%, ${alpha(brand[1], 0.45)} 0%, transparent 46%),
        linear-gradient(168deg, ${theme.colors.gray[0]} 0%, ${alpha(brand[0], 0.9)} 38%, ${theme.colors.gray[1]} 100%)
      `,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
    }
  }, [colorScheme, theme])
}
