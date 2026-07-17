// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@data/hooks/usePreference', () => ({
  usePreference: () => [false]
}))

vi.mock('@renderer/ipc', () => ({
  ipcApi: { request: vi.fn() },
  useIpcOn: vi.fn()
}))

vi.mock('@logger', () => ({
  loggerService: {
    withContext: () => ({ debug: vi.fn(), info: vi.fn(), error: vi.fn() })
  }
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

import WebviewContainer from '../WebviewContainer'

describe('WebviewContainer', () => {
  it('derives a persistent partition from the mini app id', () => {
    const { container } = render(
      <WebviewContainer
        appid="chatgpt-work"
        url="https://chat.openai.com"
        onSetRefCallback={vi.fn()}
        onLoadedCallback={vi.fn()}
        onNavigateCallback={vi.fn()}
      />
    )

    expect(container.querySelector('webview')?.getAttribute('partition')).toBe('persist:webview-chatgpt-work')
  })
})
