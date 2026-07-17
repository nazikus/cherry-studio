import { miniAppService } from '@main/data/services/MiniAppService'
import { getMiniAppPartition } from '@shared/data/types/miniApp'
import { type Session, session } from 'electron'

const MINI_APP_STORAGE_TYPES: Array<
  'cookies' | 'filesystem' | 'indexdb' | 'localstorage' | 'shadercache' | 'websql' | 'serviceworkers' | 'cachestorage'
> = ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']

export function getKnownMiniAppPartitions(): string[] {
  return [...new Set(miniAppService.list().map((app) => getMiniAppPartition(app.appId)))]
}

export function getKnownMiniAppSessions(): Session[] {
  return getKnownMiniAppPartitions().map((partition) => session.fromPartition(partition))
}

export async function clearSessionData(targetSession: Session): Promise<void> {
  await targetSession.clearCache()
  await targetSession.clearStorageData({ storages: MINI_APP_STORAGE_TYPES })
}

export async function clearMiniAppData(appId: string): Promise<void> {
  await clearSessionData(session.fromPartition(getMiniAppPartition(appId)))
}
