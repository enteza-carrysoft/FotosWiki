const MEDIAWIKI_BASE = 'https://www.mairenawiki.es/wiki/api.php'

export class MediaWikiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'MediaWikiError'
  }
}

export function buildMediaWikiUrl(params: Record<string, string>): string {
  const url = new URL(MEDIAWIKI_BASE)
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return url.toString()
}

function combineSignals(signalA: AbortSignal, signalB: AbortSignal): AbortSignal {
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([signalA, signalB])
  }

  const controller = new AbortController()

  const abort = () => {
    if (!controller.signal.aborted) controller.abort()
  }

  if (signalA.aborted || signalB.aborted) {
    abort()
    return controller.signal
  }

  signalA.addEventListener('abort', abort, { once: true })
  signalB.addEventListener('abort', abort, { once: true })

  return controller.signal
}

export async function fetchMediaWikiJson<T>(
  params: Record<string, string>,
  options?: {
    signal?: AbortSignal
    timeoutMs?: number
    init?: RequestInit
  }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? 15000
  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs)
  const signal = options?.signal
    ? combineSignals(options.signal, timeoutController.signal)
    : timeoutController.signal

  try {
    const response = await fetch(buildMediaWikiUrl(params), {
      ...options?.init,
      signal,
    })

    if (!response.ok) {
      throw new MediaWikiError(`MediaWiki request failed (${response.status})`, response.status)
    }

    return (await response.json()) as T
  } catch (error) {
    if (error instanceof MediaWikiError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new MediaWikiError('MediaWiki request timed out or was aborted')
    }
    throw new MediaWikiError('MediaWiki request failed')
  } finally {
    clearTimeout(timeoutId)
  }
}
