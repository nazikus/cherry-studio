import { beforeEach, describe, expect, it, vi } from 'vitest'

const { appOnMock, appRemoveListenerMock, getAllWebContentsMock } = vi.hoisted(() => ({
  appOnMock: vi.fn(),
  appRemoveListenerMock: vi.fn(),
  getAllWebContentsMock: vi.fn()
}))

vi.mock('@application', () => ({
  application: {
    get: vi.fn(() => ({
      getWindowIdByWebContents: vi.fn(),
      send: vi.fn()
    }))
  }
}))

vi.mock('@logger', () => ({
  loggerService: {
    withContext: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() })
  }
}))

vi.mock('@main/i18n', () => ({
  getAppLanguage: () => 'en-US',
  t: (key: string) => key
}))

vi.mock('@main/core/lifecycle', async () => {
  const actual = (await vi.importActual('@main/core/lifecycle')) as Record<string, unknown>
  class StubBase {
    registerDisposable = <T>(d: T) => d
  }
  return { ...actual, BaseService: StubBase }
})

vi.mock('electron', () => ({
  app: { on: appOnMock, removeListener: appRemoveListenerMock },
  dialog: {},
  shell: {},
  webContents: {
    getAllWebContents: getAllWebContentsMock,
    fromId: vi.fn()
  }
}))

import { WebviewService } from '../WebviewService'

const createSession = () => ({
  getUserAgent: vi.fn(() => 'Mozilla/5.0 CherryStudio/2.0 Electron/41.0 Safari/537.36'),
  setUserAgent: vi.fn(),
  webRequest: { onBeforeSendHeaders: vi.fn() }
})

const createContents = ({
  type,
  partition,
  session = createSession()
}: {
  type: string
  partition?: string
  session?: ReturnType<typeof createSession>
}) => ({
  getType: () => type,
  isDestroyed: () => false,
  getLastWebPreferences: () => ({ partition }),
  on: vi.fn(),
  once: vi.fn(),
  removeListener: vi.fn(),
  session
})

describe('WebviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAllWebContentsMock.mockReturnValue([])
  })

  it('configures existing webview sessions and skips non-webview contents', async () => {
    const firstWebviewSession = createSession()
    const secondWebviewSession = createSession()
    getAllWebContentsMock.mockReturnValue([
      createContents({ type: 'webview', partition: 'persist:webview-chatgpt', session: firstWebviewSession }),
      createContents({ type: 'webview', partition: 'persist:other', session: secondWebviewSession }),
      createContents({ type: 'window', partition: 'persist:webview-gemini' })
    ])

    const service = new WebviewService()
    await (service as any).onInit()

    expect(firstWebviewSession.setUserAgent).toHaveBeenCalledWith('Mozilla/5.0 Safari/537.36')
    expect(firstWebviewSession.webRequest.onBeforeSendHeaders).toHaveBeenCalledOnce()
    expect(secondWebviewSession.setUserAgent).toHaveBeenCalledWith('Mozilla/5.0 Safari/537.36')
    expect(secondWebviewSession.webRequest.onBeforeSendHeaders).toHaveBeenCalledOnce()
  })

  it('configures newly created mini app webview sessions once per session', async () => {
    const sharedSession = createSession()
    const service = new WebviewService()
    await (service as any).onInit()

    const createdHandler = appOnMock.mock.calls.find(([event]) => event === 'web-contents-created')?.[1]
    expect(createdHandler).toBeTypeOf('function')

    createdHandler?.(
      {},
      createContents({ type: 'webview', partition: 'persist:webview-gemini', session: sharedSession })
    )
    createdHandler?.(
      {},
      createContents({ type: 'webview', partition: 'persist:webview-gemini', session: sharedSession })
    )

    expect(sharedSession.setUserAgent).toHaveBeenCalledTimes(1)
    expect(sharedSession.webRequest.onBeforeSendHeaders).toHaveBeenCalledTimes(1)
  })
})
