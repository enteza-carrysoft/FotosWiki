# Implementación: Comentarios de app a Talk Pages de MediaWiki

**Estado:** Implementado y en producción — **modo administrador**  
**Referencia:** `docs/propuesta-comentarios-wiki.md`  
**Última actualización:** Mayo 2026

---

## Contexto técnico

- **Wiki:** mairenawiki.es · MediaWiki 1.30.0 · MySQL 8.0.45
- **API endpoint:** `https://www.mairenawiki.es/wiki/api.php`
- **CORS:** Habilitado con `origin=*`
- **Escritura:** Requiere autenticación mediante **bot de MediaWiki** (la wiki no permite edición anónima)
- **Talk pages:** Namespace 7 (`Archivo Discusión`) disponible

> **Nota importante:** Aunque en la propuesta original se contemplaba escritura anónima (token `+\`), las pruebas reales demostraron que mairenawiki.es requiere usuario autenticado para editar. Se implementó un **bot de MediaWiki** con sesión persistente.

---

## Variables de entorno

Añade en `.env.local`:

```bash
# Credenciales del bot de MediaWiki
WIKI_BOT_USER=mairena_fotos_bot
WIKI_BOT_PASS=la-contraseña-del-bot
```

El bot debe estar creado en la wiki con permisos de edición.

---

## Arquitectura

```
[App móvil]
    ↓ formulario (nombre + texto)
[Next.js Server Action]  ← nunca expone credenciales al cliente
    ↓
1. Reutilizar sesión cacheada (cookie + CSRF token) o…
2. Login: logintoken → login → CSRF token
3. POST wiki/api.php?action=edit → nueva sección
    ↓
[Talk page de la foto en mairenawiki.es]
```

**Modo actual:** los comentarios se envían a la wiki, pero **no se muestran en la app** (solo administradores pueden verlos en la wiki). La UI es "solo envío".

Características clave:
- **Sesión cacheada 29 días**: evita re-loguearse en cada comentario
- **Re-login automático**: si el token expira (`badtoken`), se reintenta una vez
- **Sanitización de wikitext**: evita inyección de marcado wiki malicioso
- **Validación con Zod**: tipado y mensajes de error consistentes
- **Moderación básica**: lista de palabras bloqueadas
- **Rate limiting por IP**: 60 segundos entre comentarios, con limpieza de entradas antiguas
- **Health monitoring del bot**: alerta tras 3 fallos consecutivos

---

## Fase 1 — Lógica de Wiki (servidor)

**Archivo:** `src/shared/lib/wiki-comments.ts`

```typescript
import 'server-only'
import type { WikiComment } from '@/shared/types/wiki-comment.types'

const WIKI_API = 'https://www.mairenawiki.es/wiki/api.php'
const COMMENT_SECTION_TITLE = 'Comentario desde MairenaFotos'
const BOT_FAILURE_ALERT_THRESHOLD = 3

// ─── Session cache (in-memory, válida para el proceso Node.js) ───────────────
interface WikiSession {
  cookie: string
  csrfToken: string
  expiresAt: number
}
let cachedSession: WikiSession | null = null

// ─── Health monitoring ─────────────────────────────────────────────────────
let consecutiveFailures = 0
let lastFailureReason: string | null = null
let lastFailureAt: number | null = null

function recordFailure(reason: string): void {
  consecutiveFailures++
  lastFailureReason = reason
  lastFailureAt = Date.now()
  if (consecutiveFailures >= BOT_FAILURE_ALERT_THRESHOLD) {
    console.error(
      `[WIKI-BOT ALERT] El bot de MediaWiki ha fallado ${consecutiveFailures} veces consecutivas. ` +
        `Último error: ${reason}. Revisar credenciales, estado de la wiki o red.`
    )
  }
}

function recordSuccess(): void {
  if (consecutiveFailures > 0) {
    console.info(`[WIKI-BOT RECOVERED] Bot operativo tras ${consecutiveFailures} fallos.`)
  }
  consecutiveFailures = 0
  lastFailureReason = null
  lastFailureAt = null
}

export function getWikiBotHealth(): {
  healthy: boolean
  consecutiveFailures: number
  lastFailureReason: string | null
  lastFailureAt: number | null
} {
  return {
    healthy: consecutiveFailures < BOT_FAILURE_ALERT_THRESHOLD,
    consecutiveFailures,
    lastFailureReason,
    lastFailureAt,
  }
}

// ─── Sesión autenticada ──────────────────────────────────────────────────────

async function getAuthenticatedSession(): Promise<WikiSession> {
  if (cachedSession && Date.now() < cachedSession.expiresAt - 10 * 60 * 1000) {
    return cachedSession
  }

  const user = process.env.WIKI_BOT_USER
  const pass = process.env.WIKI_BOT_PASS
  if (!user || !pass) {
    throw new Error('Faltan credenciales: define WIKI_BOT_USER y WIKI_BOT_PASS')
  }

  // Paso 1: logintoken
  const ltRes = await fetch(
    `${WIKI_API}?action=query&meta=tokens&type=login&format=json`,
    { cache: 'no-store' }
  )
  const ltData = await ltRes.json()
  const logintoken = ltData.query.tokens.logintoken
  const initCookies = parseCookies(ltRes.headers.getSetCookie?.() ?? [])

  // Paso 2: login (acción deprecated pero funcional en MW 1.30)
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
      Cookie: initCookies,
    },
    body: loginBody.toString(),
    cache: 'no-store',
  })
  const loginData = await loginRes.json()
  if (loginData.login?.result !== 'Success') {
    throw new Error(`Login fallido: ${loginData.login?.reason}`)
  }
  const sessionCookies = parseCookies(loginRes.headers.getSetCookie?.() ?? []) || initCookies

  // Paso 3: CSRF token autenticado
  const csrfRes = await fetch(
    `${WIKI_API}?action=query&meta=tokens&type=csrf&format=json`,
    { headers: { Cookie: sessionCookies }, cache: 'no-store' }
  )
  const csrfData = await csrfRes.json()
  const csrfToken = csrfData.query.tokens.csrftoken

  cachedSession = {
    cookie: sessionCookies,
    csrfToken,
    expiresAt: Date.now() + 29 * 24 * 60 * 60 * 1000,
  }
  return cachedSession
}

function parseCookies(setCookieHeaders: string[]): string {
  return setCookieHeaders.map((h) => h.split(';')[0]).join('; ')
}

// ─── Conversión de título ────────────────────────────────────────────────────

export function toTalkTitle(photoTitle: string): string {
  const withPrefix = photoTitle.startsWith('Archivo:')
    ? photoTitle
    : `Archivo:${photoTitle}`
  return withPrefix.replace(/^Archivo:/, 'Archivo Discusión:')
}

// ─── Publicar comentario ───────────────────────────────────────────────────────

export async function publishCommentToWiki(
  photoTitle: string,
  authorName: string,
  commentText: string
): Promise<void> {
  try {
    const talkTitle = toTalkTitle(photoTitle)
    const date = formatEsDate(new Date())
    const wikiText = buildWikitext(authorName, commentText, date)

    // Hasta 2 intentos: si el token expira, forzamos re-login
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt === 1) cachedSession = null
      const session = await getAuthenticatedSession()
      const data = await doEdit(talkTitle, wikiText, session)

      if ('error' in data && data.error?.code === 'badtoken' && attempt === 0) {
        continue // re-login en siguiente vuelta
      }
      if ('error' in data && data.error) {
        throw new Error(`wiki error: ${data.error.code} — ${data.error.info}`)
      }
      if (data.edit?.result === 'Success') {
        recordSuccess()
        return
      }
      throw new Error('wiki edit not successful')
    }
    throw new Error('edit failed after retries')
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown wiki error'
    recordFailure(reason)
    throw err
  }
}

async function doEdit(talkTitle: string, wikiText: string, session: WikiSession) {
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
  return res.json()
}

// ─── Leer comentarios (legacy, no usado en UI actual) ───────────────────────

export async function readCommentsFromWiki(photoTitle: string): Promise<WikiComment[]> {
  const talkTitle = toTalkTitle(photoTitle)
  const url =
    `${WIKI_API}?action=query&prop=revisions&rvprop=content&rvslots=main&rvlimit=1` +
    `&titles=${encodeURIComponent(talkTitle)}&format=json&origin=*`

  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) return []
  const data = await res.json()

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
    day: 'numeric', month: 'long', year: 'numeric',
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
```

---

## Fase 2 — Server Action (validación + moderación + rate limit)

**Archivo:** `src/features/comments/actions/post-comment.ts`

```typescript
'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { publishCommentToWiki } from '@/shared/lib/wiki-comments'
import type { PostCommentResult } from '@/shared/types/wiki-comment.types'

const CommentSchema = z.object({
  photoTitle: z.string().min(1).max(255),
  author: z.string().trim().min(2, 'El nombre es demasiado corto').max(60),
  text: z.string().trim().min(5, 'El comentario es demasiado corto').max(500),
})

// ─── Moderación básica ─────────────────────────────────────────────────────

const BLOCKED_WORDS = [
  'puta', 'puto', 'gilipollas', 'imbecil', 'imbécil', 'estupido', 'estúpido',
  'idiota', 'mierda', 'mierdas', 'coño', 'joder', 'hostia', 'maricón', 'maricon',
  'cabron', 'cabrón', 'polla', 'verga', 'nazi', 'hitler',
]

function containsBlockedWord(value: string): boolean {
  const lower = value.toLowerCase()
  return BLOCKED_WORDS.some((w) => lower.includes(w))
}

// ─── Rate limiting con cleanup ───────────────────────────────────────────────

const RATE_LIMIT_MS = 60_000
const RATE_LIMIT_MAX_AGE_MS = 60 * 60 * 1000 // limpiar entradas > 1h
const lastPostByIp = new Map<string, number>()

function cleanupOldRateLimitEntries(): void {
  const now = Date.now()
  for (const [ip, timestamp] of lastPostByIp.entries()) {
    if (now - timestamp > RATE_LIMIT_MAX_AGE_MS) {
      lastPostByIp.delete(ip)
    }
  }
}

function getClientIp(h: Headers): string {
  const xff = h.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return h.get('x-real-ip') ?? 'unknown'
}

// ─── Server Action ───────────────────────────────────────────────────────────

export async function postPhotoComment(input: {
  photoTitle: string
  author: string
  text: string
}): Promise<PostCommentResult> {
  // Validación Zod
  const parsed = CommentSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  // Moderación básica
  if (containsBlockedWord(parsed.data.author) || containsBlockedWord(parsed.data.text)) {
    return { ok: false, error: 'El comentario contiene lenguaje no permitido' }
  }

  // Rate limiting
  cleanupOldRateLimitEntries()
  const h = await headers()
  const ip = getClientIp(h)
  const now = Date.now()
  const last = lastPostByIp.get(ip)
  if (last && now - last < RATE_LIMIT_MS) {
    const wait = Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000)
    return { ok: false, error: `Espera ${wait}s antes de enviar otro comentario` }
  }

  try {
    await publishCommentToWiki(parsed.data.photoTitle, parsed.data.author, parsed.data.text)
    lastPostByIp.set(ip, now)
    return {
      ok: true,
      comment: {
        author: parsed.data.author,
        text: parsed.data.text,
        date: new Date().toLocaleDateString('es-ES', {
          day: 'numeric', month: 'long', year: 'numeric',
        }),
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error de red'
    return { ok: false, error: msg }
  }
}
```

---

## Fase 3 — Componente UI (modo "solo envío")

**Archivo:** `src/features/comments/components/PhotoComments.tsx`

Los comentarios **no se muestran** en la app. Solo se presenta el formulario de envío.

```tsx
'use client'

import { useState } from 'react'
import { postPhotoComment } from '../actions/post-comment'

interface Props {
  photoTitle: string
}

export default function PhotoComments({ photoTitle }: Props) {
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const canSend = name.trim().length >= 2 && text.trim().length >= 5 && !sending

  const handleSubmit = async () => {
    if (!canSend) return
    setSending(true)
    setError(null)
    const result = await postPhotoComment({ photoTitle, author: name, text })
    setSending(false)
    if (result.ok && result.comment) {
      setSent(true)
      setName('')
      setText('')
      setShowForm(false)
    } else {
      setError(result.error ?? 'No se pudo enviar')
    }
  }

  return (
    <section className="border-t border-stone-800 pt-4 mt-4">
      <h3 className="text-stone-400 text-xs uppercase tracking-wider mb-3">
        Comentarios
      </h3>

      <p className="text-stone-500 text-xs leading-relaxed mb-3">
        Los comentarios se envían directamente a la página de discusión de esta foto en
        mairenawiki.es, donde los administradores podrán consultarlos.{' '}
        <strong className="text-stone-400">Aún no se muestran en la app.</strong>
      </p>

      {sent && (
        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3 mb-3">
          <p className="text-green-400 text-sm">¡Gracias! Tu comentario ha sido enviado.</p>
          <p className="text-green-500/70 text-xs mt-1">
            Los administradores lo revisarán en la wiki.
          </p>
        </div>
      )}

      {showForm ? (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white text-sm placeholder-stone-500 outline-none focus:border-amber-500"
          />
          <textarea
            placeholder="Cuéntanos algo sobre esta foto…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={3}
            className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white text-sm placeholder-stone-500 outline-none focus:border-amber-500 resize-none"
          />
          <div className="flex justify-between items-center text-stone-500 text-xs">
            <span>{text.length}/500</span>
            {error && <span className="text-red-400">{error}</span>}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowForm(false); setError(null) }}
              className="flex-1 h-9 rounded-lg border border-stone-600 text-stone-400 text-sm active:bg-stone-800">
              Cancelar
            </button>
            <button type="button" onClick={handleSubmit} disabled={!canSend}
              className="flex-1 h-9 rounded-lg bg-amber-500 text-black text-sm font-bold disabled:opacity-40 active:bg-amber-400">
              {sending ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => { setSent(false); setShowForm(true) }}
          className="text-amber-400/80 text-sm hover:text-amber-400 active:text-amber-300">
          + Añadir comentario
        </button>
      )}
    </section>
  )
}
```

---

## Fase 4 — Integración en paneles de detalle

**Archivos:** `src/features/gallery/components/PhotoDetailPanel.tsx` y `PhotoDetailSheet.tsx`

Ambos importan y renderizan:

```tsx
import PhotoComments from '@/features/comments/components/PhotoComments'

// Dentro del cuerpo de la ficha:
<PhotoComments photoTitle={photo.title} />
```

El componente `PhotoComments` maneja todo el estado internamente. Los paneles permanecen limpios.

---

## Tipos compartidos

**Archivo:** `src/shared/types/wiki-comment.types.ts`

```typescript
export interface WikiComment {
  author: string
  text: string
  date: string
}

export interface PostCommentResult {
  ok: boolean
  error?: string
  comment?: WikiComment
}
```

---

## Consideraciones de moderación

| Riesgo | Mitigación implementada | Mitigación adicional posible |
|--------|------------------------|------------------------------|
| Spam | Rate limit 60s por IP | CAPTCHA, Redis distribuido |
| Contenido inapropiado | Lista de palabras bloqueadas + Zod | Revisión manual en wiki |
| Inyección wikitext | `sanitizeInline()` y `sanitizeBlock()` | — |
| Anonimato | Campo nombre obligatorio | — (intencionado) |
| Ediciones maliciosas | Solo añade secciones nuevas | Admins de la wiki pueden revertir |
| Bot caído | Alerta tras 3 fallos consecutivos | Página de health check externa |

---

## Health monitoring del bot

`getWikiBotHealth()` devuelve el estado del bot:

```typescript
{
  healthy: boolean       // false si ≥3 fallos consecutivos
  consecutiveFailures: number
  lastFailureReason: string | null
  lastFailureAt: number | null  // timestamp
}
```

Puedes exponerlo en una ruta `/api/health/bot` si necesitas monitoreo externo:

```typescript
// app/api/health/bot/route.ts (opcional)
import { getWikiBotHealth } from '@/shared/lib/wiki-comments'
import { NextResponse } from 'next/server'

export async function GET() {
  const health = getWikiBotHealth()
  return NextResponse.json(health, {
    status: health.healthy ? 200 : 503,
  })
}
```

---

## Resumen de archivos

| Archivo | Estado | Descripción |
|---------|--------|-------------|
| `src/shared/lib/wiki-comments.ts` | ✅ Existente | Lógica de API de MediaWiki + health monitoring |
| `src/shared/types/wiki-comment.types.ts` | ✅ Existente | Tipos TypeScript |
| `src/features/comments/actions/post-comment.ts` | ✅ Existente | Server Action con Zod + moderación + rate limit |
| `src/features/comments/components/PhotoComments.tsx` | ✅ Existente | UI "solo envío" (no muestra comentarios) |
| `src/features/gallery/components/PhotoDetailPanel.tsx` | ✅ Modificado | Integra `<PhotoComments>` en desktop |
| `src/features/gallery/components/PhotoDetailSheet.tsx` | ✅ Modificado | Integra `<PhotoComments>` en móvil |
| `src/features/comments/hooks/usePhotoComments.ts` | ❌ Eliminado | No usado en modo administrador |
| `src/app/api/photo-comments/[title]/route.ts` | ❌ Eliminado | No usado en modo administrador |

---

## Mejoras futuras

1. **Persistencia del rate limit**
   - Actualmente es in-memory (`Map`). Si el server se reinicia, se pierde.
   - Opción: Redis, Upstash, o archivo en disco para single-instance.

2. **Lista de palabras configurable**
   - Extraer `BLOCKED_WORDS` a una variable de entorno o archivo JSON para poder actualizar sin deploy.

3. **Tests E2E**
   - Flujo completo: abrir foto → añadir comentario → verificar en talk page (con bot de staging).

4. **Modo público (futuro)**
   - Cuando los administradores aprueben la visualización, reactivar `readCommentsFromWiki` + API route + hook.
   - El código de lectura sigue disponible en `wiki-comments.ts`.

---

**Tiempo estimado original:** 1h 30min  
**Tiempo real de implementación:** ~2h 30min (incluyendo descubrimiento de autenticación obligatoria)  
**Tiempo de mejoras (admin mode):** ~30min
