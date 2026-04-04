import { Image, type ImageProps } from '@mantine/core'

import { logo64Url, logo128Url } from '@/branding/publicAssets'

type SiteLogoPlacement = 'header' | 'login'

export function SiteLogoImage({
  placement,
  alt = '',
  style,
  ...rest
}: { placement: SiteLogoPlacement } & Omit<ImageProps, 'src' | 'alt'> & { alt?: string }) {
  const mergedStyle = { flexShrink: 0, ...style }

  if (placement === 'header') {
    return (
      <Image
        src={logo64Url}
        alt={alt}
        h={32}
        w={32}
        mah={32}
        maw={32}
        fit="contain"
        style={mergedStyle}
        {...rest}
      />
    )
  }
  return (
    <Image
      src={logo128Url}
      alt={alt}
      h={64}
      w="auto"
      maw={200}
      mah={80}
      fit="contain"
      mx="auto"
      style={mergedStyle}
      {...rest}
    />
  )
}
