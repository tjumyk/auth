import { alpha, useComputedColorScheme, useMantineTheme } from '@mantine/core'
import { type CSSProperties, useMemo } from 'react'

export function useAppShellBackdropStyles(): {
  root: CSSProperties
  main: CSSProperties
  header: CSSProperties
  footer: CSSProperties
  navbar: CSSProperties
} {
  const theme = useMantineTheme()
  const colorScheme = useComputedColorScheme('light')

  return useMemo(() => {
    const { brand } = theme.colors
    const isDark = colorScheme === 'dark'

    const root: CSSProperties = isDark
      ? {
          minHeight: '100dvh',
          backgroundColor: theme.colors.dark[8],
          backgroundImage: `
            radial-gradient(ellipse 85% 55% at 50% -18%, ${alpha(brand[5], 0.28)} 0%, transparent 58%),
            radial-gradient(ellipse 65% 50% at 102% 58%, ${alpha(brand[7], 0.22)} 0%, transparent 52%),
            radial-gradient(ellipse 55% 42% at -8% 88%, ${alpha(brand[9], 0.14)} 0%, transparent 46%),
            linear-gradient(185deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 42%, ${theme.colors.dark[9]} 100%)
          `,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }
      : {
          minHeight: '100dvh',
          backgroundColor: theme.colors.gray[0],
          backgroundImage: `
            radial-gradient(ellipse 95% 58% at 48% -12%, ${alpha(brand[3], 0.38)} 0%, transparent 56%),
            radial-gradient(ellipse 72% 52% at 100% 72%, ${alpha(brand[1], 0.42)} 0%, transparent 54%),
            radial-gradient(ellipse 58% 48% at -6% 90%, ${alpha(brand[0], 0.9)} 0%, transparent 50%),
            linear-gradient(185deg, ${theme.colors.gray[0]} 0%, ${alpha(brand[0], 0.5)} 45%, ${theme.colors.gray[1]} 100%)
          `,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }

    const glass: CSSProperties = isDark
      ? {
          backgroundColor: alpha(theme.colors.dark[8], 0.62),
          backdropFilter: 'saturate(180%) blur(14px)',
        }
      : {
          backgroundColor: alpha('#fff', 0.58),
          backdropFilter: 'saturate(180%) blur(14px)',
        }

    const hairline = isDark ? alpha(theme.white, 0.07) : alpha(theme.black, 0.06)

    return {
      root,
      main: { background: 'transparent' },
      header: {
        ...glass,
        borderBottom: `1px solid ${hairline}`,
      },
      footer: {
        ...glass,
        borderTop: `1px solid ${hairline}`,
      },
      navbar: {
        ...glass,
        borderRight: `1px solid ${hairline}`,
      },
    }
  }, [colorScheme, theme])
}
