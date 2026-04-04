import { Badge, createTheme, type MantineColorsTuple } from '@mantine/core'

// Generated from https://mantine.dev/colors-generator/?color=5474B4
const brand: MantineColorsTuple = [
  "#ecf4ff",
  "#dce4f5",
  "#b9c7e2",
  "#94a8d0",
  "#748dc0",
  "#5f7cb7",
  "#5474b4",
  "#44639f",
  "#3a5890",
  "#2c4b80"
]

export const theme = createTheme({
  primaryColor: 'brand',
  colors: {
    brand,
  },
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, Helvetica Neue, PingFang SC, Microsoft YaHei, Source Han Sans SC, Noto Sans CJK SC, WenQuanYi Micro Hei, Arial, Helvetica, sans-serif',
  components: {
    Badge: Badge.extend({ 
      /* Fix badge clipping issue for CJK characters. */
      styles: {
        root: {
          overflow: 'visible',
        },
        label: {
          overflow: 'visible',
          textBoxTrim: 'none',
          textBoxEdge: 'text',
        },
      },
    }),
  },
})
