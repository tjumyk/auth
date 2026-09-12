import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { ThemeLocaleToolbar } from '@/components/layout/ThemeLocaleToolbar'
import { I18nProvider } from '@/i18n'

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

global.ResizeObserver = ResizeObserverMock

function renderToolbar(): ReturnType<typeof render> {
  return render(
    <MantineProvider defaultColorScheme="auto">
      <I18nProvider>
        <ThemeLocaleToolbar />
      </I18nProvider>
    </MantineProvider>,
  )
}

describe('ThemeLocaleToolbar', () => {
  it('exposes light, follow-device, and dark theme options', () => {
    renderToolbar()

    expect(screen.getByRole('radio', { name: 'Light theme' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Use device theme' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Dark theme' })).toBeInTheDocument()
  })

  it('applies an explicit scheme and can return to follow-device mode', async () => {
    const user = userEvent.setup()
    renderToolbar()

    await user.click(screen.getByRole('radio', { name: 'Dark theme' }))
    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'dark')
    expect(screen.getByRole('radio', { name: 'Dark theme' })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: 'Use device theme' }))
    expect(screen.getByRole('radio', { name: 'Use device theme' })).toBeChecked()
    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'light')
  })
})
