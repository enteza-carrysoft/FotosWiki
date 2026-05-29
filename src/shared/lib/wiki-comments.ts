import 'server-only'
import type { WikiComment } from '@/shared/types/wiki-comment.types'

const WIKI_API = 'https://www.mairenawiki.es/wiki/api.php'
const COMMENT_SECTION_TITLE = 'Comentario desde MairenaFotos'

// ─── Session cache (in-memory, válida para el proceso Node.js) ───────────────
// La sesión de MediaWiki dura ~30 días; cacheamos para no re-logarnos en cada
// comentario. Si el servidor se reinicia, vuelve a hacer login automáticamente.
interface WikiSession {
  cookie: string
  csrfToken: string
  expiresAt: number
}
let cachedSession: WikiSession | null = null

function parseCookies(setCookieHeaders: string[]): string {
  return setCookieHeaders
    .map((h) => h.split(';')[0])
    .join('; ')
}

async function getAuthenticatedSession(): Promise<WikiSession> {
  // Devolver sesión en caché si sigue vigente (margen de 10 min)
  if (cachedSession && Date.now() < cachedSession.expiresAt - 10 * 60 * 1000) {
    return cachedSession
  }

  const user = process.env.WIKI_BOT_USER
  const pass = process.env.WIKI_BOT_PASS
  if (!user || !pass) {
    throw new Error(
      'Faltan credenciales: define WIKI_BOT_USER y WIKI_BOT_PASS en .env.local'
    )
  }

  // Paso 1: obtener logintoken
  const ltRes = await fetch(
    `${WIKI_API}?action=query&meta=tokens&type=login&format=json`,
    { cache: 'no-store' }
  )
  if (!ltRes.ok) throw new Error(`login token HTTP ${ltRes.status}`)
  const ltData = (await ltRes.json()) as {
    query?: { tokens?: { logintoken?: string } }
  }
  const logintoken = ltData?.query?.tokens?.logintoken
  if (!logintoken) throw new Error('No se pudo obtener logintoken')

  const initCookies = parseCookies(
    (ltRes.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? []
  )

  // Paso 2: login con acción deprecated pero funcional para bot passwords en MW 1.30
  const loginBody = new URLSearchParams({
    action: 'login',
    lgname: user,
    lgpassword: pass,
    lgtoken: logintoken,
    format: 'json',
  })
  const loginRes = await fetch(WIKI_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(initCookies ? { Cookie: initCookies } : {}),
    },
    body: loginBody.toString(),
    cache: 'no-store',
  })
  if (!loginRes.ok) throw new Error(`login HTTP ${loginRes.status}`)
  const loginData = (await loginRes.json()) as {
    login?: { result?: string; reason?: string }
  }
  if (loginData.login?.result !== 'Success') {
    throw new Error(
      `Login fallido: ${loginData.login?.result ?? 'respuesta inesperada'} — ${loginData.login?.reason ?? ''}`
    )
  }

  const sessionCookies = parseCookies(
    (loginRes.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ??
      []
  ) || initCookies

  // Paso 3: obtener CSRF token ya autenticados
  const csrfRes = await fetch(
    `${WIKI_API}?action=query&meta=tokens&type=csrf&format=json`,
    {
      headers: { Cookie: sessionCookies },
      cache: 'no-store',
    }
  )
  if (!csrfRes.ok) throw new Error(`csrf HTTP ${csrfRes.status}`)
  const csrfData = (await csrfRes.json()) as {
    query?: { tokens?: { csrftoken?: string } }
  }
  const csrfToken = csrfData?.query?.tokens?.csrftoken
  if (!csrfToken) throw new Error('No se pudo obtener CSRF token tras login')

  // Guardar sesión por 29 días
  cachedSession = {
    cookie: sessionCookies,
    csrfToken,
    expiresAt: Date.now() + 29 * 24 * 60 * 60 * 1000,
  }
  return cachedSession
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export function toTalkTitle(photoTitle: string): string {
  const withPrefix = photoTitle.startsWith('Archivo:')
    ? photoTitle
    : `Archivo:${photoTitle}`
  return withPrefix.replace(/^Archivo:/, 'Archivo Discusión:')
}

interface WikiEditOk {
  edit: { result: 'Success'; newrevid?: number; pageid?: number }
}
interface WikiEditError {
  error: { code: string; info: string }
}

async function doEdit(
  talkTitle: string,
  wikiText: string,
  session: WikiSession
): Promise<Partial<WikiEditOk & WikiEditError>> {
  const body = new URLSearchParams({
    action: 'edit',
    title: talkTitle,
    section: 'new',
    sectiontitle: COMMENT_SECTION_TITLE,
    text: wikiText,
    summary: 'Nuevo comentario desde MairenaFotos',
    token: session.csrfToken,
    format: 'json',
  })
  const res = await fetch(WIKI_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: session.cookie,
    },
    body: body.toString(),
    cache: 'no-store',
  })
  return res.json() as Promise<Partial<WikiEditOk & WikiEditError>>
}

// ─── API pública ─────────────────────────────────────────────────────────────

export async function publishCommentToWiki(
  photoTitle: string,
  authorName: string,
  commentText: string
): Promise<void> {
  const talkTitle = toTalkTitle(photoTitle)
  const date = formatEsDate(new Date())
  const wikiText = buildWikitext(authorName, commentText, date)

  // Hasta 2 intentos: si el token expira entre llamadas, forzamos re-login
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt === 1) cachedSession = null  // forzar re-login en 2.º intento
    const session = await getAuthenticatedSession()
    const data = await doEdit(talkTitle, wikiText, session)

    if ('error' in data && data.error?.code === 'badtoken' && attempt === 0) {
      continue  // token expiró → re-login en siguiente vuelta
    }
    if ('error' in data && data.error) {
      throw new Error(`wiki error: ${data.error.code} — ${data.error.info}`)
    }
    if (data.edit?.result === 'Success') return
    throw new Error('wiki edit not successful')
  }
  throw new Error('edit failed after retries')
}

export async function readCommentsFromWiki(photoTitle: string): Promise<WikiComment[]> {
  const talkTitle = toTalkTitle(photoTitle)
  const url =
    `${WIKI_API}?action=query&prop=revisions&rvprop=content&rvslots=main&rvlimit=1` +
    `&titles=${encodeURIComponent(talkTitle)}&format=json&origin=*`

  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) return []
  const data = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          missing?: string
          revisions?: Array<{ '*'?: string; slots?: { main?: { '*'?: string } } }>
        }
      >
    }
  }

  const pages = data?.query?.pages
  if (!pages || typeof pages !== 'object') return []
  const page = Object.values(pages)[0]
  if (!page || page.missing !== undefined) return []
  const rev = page.revisions?.[0]
  const content = rev?.slots?.main?.['*'] ?? rev?.['*'] ?? ''
  return parseWikiComments(content)
}

export function parseWikiComments(wikitext: string): WikiComment[] {
  if (!wikitext) return []
  const parts = wikitext.split(/^==\s*Comentario desde MairenaFotos\s*==\s*$/m).slice(1)
  const result: WikiComment[] = []
  for (const part of parts) {
    const body = part.split(/^==\s/m)[0] ?? ''
    const author = body.match(/\*'''Nombre:'''\s*(.+)/)?.[1]?.trim() ?? 'Anónimo'
    const text =
      body.match(/\*'''Comentario:'''\s*([\s\S]*?)\n(?:—|\*|$)/)?.[1]?.trim() ?? ''
    const date = body.match(/·\s*([^']+?)\s*''/)?.[1]?.trim() ?? ''
    if (text.length > 0) result.push({ author, text, date })
  }
  return result
}

// ─── Helpers privados ────────────────────────────────────────────────────────

function formatEsDate(d: Date): string {
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function buildWikitext(author: string, text: string, date: string): string {
  const safeAuthor = sanitizeInline(author)
  const safeText = sanitizeBlock(text)
  return `*'''Nombre:''' ${safeAuthor}\n*'''Comentario:''' ${safeText}\n— ''Enviado desde [[MairenaFotos]] · ${date}''`
}

function sanitizeInline(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').replace(/[<>{}|]/g, '').trim()
}

function sanitizeBlock(s: string): string {
  return s.replace(/[<>{}|]/g, '').replace(/\r?\n/g, ' <br>').trim()
}
