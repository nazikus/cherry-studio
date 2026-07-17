import { beforeEach, describe, expect, it, vi } from 'vitest'

const { listMock, fromPartitionMock, sessionByPartition } = vi.hoisted(() => {
  const sessionByPartition = new Map<
    string,
    { clearCache: ReturnType<typeof vi.fn>; clearStorageData: ReturnType<typeof vi.fn> }
  >()

  return {
    listMock: vi.fn(),
    fromPartitionMock: vi.fn((partition: string) => {
      const cached = sessionByPartition.get(partition)
      if (cached) return cached
      const created = {
        clearCache: vi.fn().mockResolvedValue(undefined),
        clearStorageData: vi.fn().mockResolvedValue(undefined)
      }
      sessionByPartition.set(partition, created)
      return created
    }),
    sessionByPartition
  }
})

vi.mock('@main/data/services/MiniAppService', () => ({
  miniAppService: {
    list: listMock
  }
}))

vi.mock('electron', () => ({
  session: {
    fromPartition: fromPartitionMock
  }
}))

import {
  clearMiniAppData,
  clearSessionData,
  getKnownMiniAppPartitions,
  getKnownMiniAppSessions,
  isKnownMiniAppAppId
} from '../miniAppSessions'

describe('miniAppSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionByPartition.clear()
  })

  it('builds known partitions from mini app ids', () => {
    listMock.mockReturnValue([{ appId: 'chatgpt' }, { appId: 'gemini' }, { appId: 'chatgpt' }])

    expect(getKnownMiniAppPartitions()).toEqual(['persist:webview-chatgpt', 'persist:webview-gemini'])
  })

  it('resolves known sessions from every partition', () => {
    listMock.mockReturnValue([{ appId: 'chatgpt' }, { appId: 'gemini' }])

    const sessions = getKnownMiniAppSessions()

    expect(fromPartitionMock).toHaveBeenCalledWith('persist:webview-chatgpt')
    expect(fromPartitionMock).toHaveBeenCalledWith('persist:webview-gemini')
    expect(sessions).toHaveLength(2)
  })

  it('checks whether an app id belongs to a known mini app', () => {
    listMock.mockReturnValue([{ appId: 'chatgpt' }])

    expect(isKnownMiniAppAppId('chatgpt')).toBe(true)
    expect(isKnownMiniAppAppId('gemini')).toBe(false)
  })

  it('clears cache and storage for a session', async () => {
    const targetSession = {
      clearCache: vi.fn().mockResolvedValue(undefined),
      clearStorageData: vi.fn().mockResolvedValue(undefined)
    }

    await clearSessionData(targetSession as never)

    expect(targetSession.clearCache).toHaveBeenCalledOnce()
    expect(targetSession.clearStorageData).toHaveBeenCalledWith({
      storages: [
        'cookies',
        'filesystem',
        'indexdb',
        'localstorage',
        'shadercache',
        'websql',
        'serviceworkers',
        'cachestorage'
      ]
    })
  })

  it('clears data for a single mini app partition', async () => {
    await clearMiniAppData('notebooklm')

    expect(fromPartitionMock).toHaveBeenCalledWith('persist:webview-notebooklm')
    const targetSession = sessionByPartition.get('persist:webview-notebooklm')
    expect(targetSession?.clearCache).toHaveBeenCalledOnce()
    expect(targetSession?.clearStorageData).toHaveBeenCalledOnce()
  })
})
