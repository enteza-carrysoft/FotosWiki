import 'server-only'
import type { WikiComment } from '@/shared/types/wiki-comment.types'

const WIKI_API = 'https://www.mairenawiki.es/wiki/api.php'
const COMMENT_SECTION_TITLE = 'Comentario desde MairenaFotos'

export function toTalkTitle(photoTitle: string): string {
  const withPrefix = photoTitle.startsWith('Archivo:')
    ? photoTitle
    : `Archivo:${photoTitle}`
  return withPrefix.replace(/^Archivo:/, 'Archivo Discusión:')
}

async function getCsrfToken(): Promise<string> {
  const url = `${WIKI_API}?action=query&meta=tokens&type=csrf&format=json&origin=*`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`csrf token HTTP ${res.status}`)
  const data = (await res.json()) as { query?: { tokens?: { csrftoken?: string } } }
  const token = data?.query?.tokens?.csrftoken
  if (!token) throw new Error('csrf token missing in response')
  return token
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
  token: string
): Promise<Partial<WikiEditOk & WikiEditError>> {
  const body = new URLSearchParams({
    action: 'edit',
    title: talkTitle,
    section: 'new',
    sectiontitle: COMMENT_SECTION_TITLE,
    text: wikiText,
    summary: 'Nuevo comentario desde MairenaFotos',
    token,
    format: 'json',
    origin: '*',
  })
  const res = await fetch(WIKI_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  })
  return res.json() as Promise<Partial<WikiEditOk & WikiEditError>>
}

export async function publishCommentToWiki(
  photoTitle: string,
  authorName: string,
  commentText: string
): Promise<void> {
  const talkTitle = toTalkTitle(photoTitle)
  const date = formatEsDate(new Date())
  const wikiText = buildWikitext(authorName, commentText, date)

  let attempt = 0
  let lastErr: unknown
  while (attempt < 2) {
    try {
      const token = await getCsrfToken()
      const data = await doEdit(talkTitle, wikiText, token)
      if ('error' in data && data.error?.code === 'badtoken' && attempt === 0) {
        attempt++
        continue
      }
      if ('error' in data && data.error) {
        throw new Error(`wiki error: ${data.error.code} — ${data.error.info}`)
      }
      if (data.edit?.result !== 'Success') {
        throw new Error('wiki edit not successful')
      }
      return
    } catch (err) {
      lastErr = err
      attempt++
    }
  }
  throw lastErr ?? new Error('edit failed after retries')
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
    const text = body.match(/\*'''Comentario:'''\s*([\s\S]*?)\n(?:—|\*|$)/)?.[1]?.trim() ?? ''
    const date = body.match(/·\s*([^']+?)\s*''/)?.[1]?.trim() ?? ''
    if (text.length > 0) result.push({ author, text, date })
  }
  return result
}

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
