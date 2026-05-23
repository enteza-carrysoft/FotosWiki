# Implementación: Comentarios de app a Talk Pages de MediaWiki

**Estado:** Pendiente de aprobación de administradores de mairenawiki.es  
**Referencia:** `docs/propuesta-comentarios-wiki.md`

---

## Contexto técnico verificado

- **Wiki:** mairenawiki.es · MediaWiki 1.30.0 · MySQL 8.0.45
- **API endpoint:** `https://www.mairenawiki.es/wiki/api.php`
- **CORS:** Habilitado con `origin=*`
- **Escritura anónima:** Sí — el token CSRF para anónimos es `+\`
- **Talk pages:** Namespace 7 (`Archivo Discusión`) disponible

---

## Arquitectura

```
[App móvil]
    ↓ formulario (nombre + texto)
[Next.js Server Action]  ← nunca expone token al cliente
    ↓
1. GET  wiki/api.php?action=query&meta=tokens&type=csrf  → token
2. POST wiki/api.php?action=edit                         → nueva sección
    ↓
[Talk page de la foto en mairenawiki.es]
```

Los comentarios se leen con:
```
GET wiki/api.php?action=query&prop=revisions&rvprop=content&titles=Archivo Discusión:X
```

---

## Fase 1 — Server Action

**Archivo:** `src/shared/lib/wiki-comments.ts`

```typescript
'use server'

const WIKI_API = 'https://www.mairenawiki.es/wiki/api.php'

async function getCsrfToken(): Promise<string> {
  const res = await fetch(
    `${WIKI_API}?action=query&meta=tokens&type=csrf&format=json&origin=*`
  )
  const data = await res.json()
  return data.query.tokens.csrftoken  // '+\' para anónimos
}

export interface WikiComment {
  author: string
  text: string
  date: string
}

export async function postPhotoComment(
  photoTitle: string,  // e.g. "Archivo:Corpus_1978.jpg"
  authorName: string,
  commentText: string
): Promise<{ ok: boolean; error?: string }> {
  // Validación básica
  if (!authorName.trim() || authorName.length > 60) return { ok: false, error: 'Nombre inválido' }
  if (!commentText.trim() || commentText.length < 5) return { ok: false, error: 'Comentario demasiado corto' }
  if (commentText.length > 500) return { ok: false, error: 'Comentario demasiado largo (máx. 500 caracteres)' }

  // Construir título de la talk page
  // "Archivo:Corpus_1978.jpg" → "Archivo Discusión:Corpus_1978.jpg"
  const talkTitle = photoTitle.replace(/^Archivo:/, 'Archivo Discusión:')

  const date = new Date().toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  const wikiText = `*'''Nombre:''' ${authorName.trim()}
*'''Comentario:''' ${commentText.trim()}
— ''Enviado desde [[MairenaFotos]] · ${date}''`

  try {
    const token = await getCsrfToken()

    const body = new URLSearchParams({
      action: 'edit',
      title: talkTitle,
      section: 'new',
      sectiontitle: 'Comentario desde MairenaFotos',
      text: wikiText,
      token,
      format: 'json',
      origin: '*',
    })

    const res = await fetch(WIKI_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    const data = await res.json()

    if (data.edit?.result === 'Success') return { ok: true }
    return { ok: false, error: data.error?.info ?? 'Error desconocido' }
  } catch {
    return { ok: false, error: 'Error de red' }
  }
}

export async function getPhotoComments(photoTitle: string): Promise<WikiComment[]> {
  const talkTitle = photoTitle.replace(/^Archivo:/, 'Archivo Discusión:')

  try {
    const url = `${WIKI_API}?action=query&prop=revisions&rvprop=content&rvlimit=1&titles=${encodeURIComponent(talkTitle)}&format=json&origin=*`
    const res = await fetch(url, { next: { revalidate: 300 } }) // cache 5 min
    const data = await res.json()

    const pages = Object.values(data.query?.pages ?? {}) as Array<{ revisions?: Array<{ '*': string }> }>
    const content = pages[0]?.revisions?.[0]?.['*'] ?? ''

    return parseWikiComments(content)
  } catch {
    return []
  }
}

function parseWikiComments(wikitext: string): WikiComment[] {
  // Cada comentario es una sección "== Comentario desde MairenaFotos =="
  const sections = wikitext.split(/^== Comentario desde MairenaFotos ==/m).slice(1)

  return sections.map((section) => {
    const author = section.match(/\*'''Nombre:''' (.+)/)?.[1]?.trim() ?? 'Anónimo'
    const text = section.match(/\*'''Comentario:''' (.+)/)?.[1]?.trim() ?? ''
    const date = section.match(/· (.+?)''/)?.[1]?.trim() ?? ''
    return { author, text, date }
  }).filter((c) => c.text.length > 0)
}
```

**Rate limiting básico** (añadir en el Server Action):

```typescript
// Simple in-memory rate limit: 1 comentario por IP cada 60s
const lastPost = new Map<string, number>()

export async function postPhotoComment(...) {
  const { headers } = await import('next/headers')
  const ip = (await headers()).get('x-forwarded-for') ?? 'unknown'
  const now = Date.now()
  if (lastPost.has(ip) && now - lastPost.get(ip)! < 60_000) {
    return { ok: false, error: 'Espera un momento antes de comentar de nuevo' }
  }
  lastPost.set(ip, now)
  // ... resto del código
}
```

---

## Fase 2 — Componente UI

**Archivo:** `src/features/gallery/components/PhotoComments.tsx`

```tsx
'use client'

import { useState } from 'react'
import type { WikiComment } from '@/shared/lib/wiki-comments'
import { postPhotoComment } from '@/shared/lib/wiki-comments'

interface Props {
  photoTitle: string
  initialComments: WikiComment[]
}

export default function PhotoComments({ photoTitle, initialComments }: Props) {
  const [comments, setComments] = useState<WikiComment[]>(initialComments)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [showForm, setShowForm] = useState(false)

  const handleSubmit = async () => {
    setStatus('sending')
    const result = await postPhotoComment(photoTitle, name, text)
    if (result.ok) {
      setComments((prev) => [
        ...prev,
        { author: name, text, date: new Date().toLocaleDateString('es-ES') }
      ])
      setName('')
      setText('')
      setStatus('ok')
      setShowForm(false)
      setTimeout(() => setStatus('idle'), 3000)
    } else {
      setErrorMsg(result.error ?? 'Error al enviar')
      setStatus('error')
    }
  }

  return (
    <div className="border-t border-stone-800 pt-4 mt-4">
      <h3 className="text-stone-400 text-xs uppercase tracking-wider mb-3">
        Comentarios ({comments.length})
      </h3>

      {/* Lista de comentarios */}
      {comments.map((c, i) => (
        <div key={i} className="mb-3 bg-stone-800/50 rounded-lg p-3">
          <p className="text-white text-sm">{c.text}</p>
          <p className="text-stone-500 text-xs mt-1">
            — {c.author} · {c.date}
          </p>
        </div>
      ))}

      {/* Formulario */}
      {showForm ? (
        <div className="flex flex-col gap-2 mt-3">
          <p className="text-stone-500 text-xs leading-relaxed">
            Los comentarios son públicos y pueden ser editados por los administradores de la wiki.
          </p>
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
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 h-9 rounded-lg border border-stone-600 text-stone-400 text-sm active:bg-stone-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={status === 'sending' || !name.trim() || !text.trim()}
              className="flex-1 h-9 rounded-lg bg-amber-500 text-black text-sm font-bold disabled:opacity-40 active:bg-amber-400"
            >
              {status === 'sending' ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
          {status === 'error' && (
            <p className="text-red-400 text-xs">{errorMsg}</p>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-2 text-amber-400/70 text-sm hover:text-amber-400 active:text-amber-300 transition-colors"
        >
          + Añadir comentario
        </button>
      )}

      {status === 'ok' && (
        <p className="text-green-400 text-xs mt-2">¡Comentario enviado! Aparecerá en la wiki.</p>
      )}
    </div>
  )
}
```

---

## Fase 3 — Integración en el panel de detalle

En `PhotoDetailPanel.tsx` y `PhotoDetailSheet.tsx`, cargar los comentarios y pasar al componente:

```tsx
// En el Server Component o con useEffect según el contexto:
import { getPhotoComments } from '@/shared/lib/wiki-comments'
import PhotoComments from './PhotoComments'

// Dentro del render del detalle de foto:
<PhotoComments
  photoTitle={photo.title}  // "Archivo:Corpus_1978.jpg"
  initialComments={comments}
/>
```

> **Nota:** Como `PhotoDetailPanel` y `PhotoDetailSheet` son Client Components, cargar los comentarios requiere un `useEffect` + `fetch` a una API route, o convertir el panel en un Server Component con Suspense. La solución más limpia sería crear `/api/photo-comments/[title]/route.ts` que llame a `getPhotoComments`.

---

## API Route para leer comentarios (alternativa limpia)

**Archivo:** `src/app/api/photo-comments/[title]/route.ts`

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { getPhotoComments } from '@/shared/lib/wiki-comments'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ title: string }> }
) {
  const { title } = await params
  const photoTitle = decodeURIComponent(title)
  const comments = await getPhotoComments(photoTitle)
  return NextResponse.json(comments, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
  })
}
```

En el cliente:
```typescript
const comments = await fetch(`/api/photo-comments/${encodeURIComponent(photo.title)}`).then(r => r.json())
```

---

## Consideraciones de moderación

| Riesgo | Mitigación implementada | Mitigación adicional posible |
|--------|------------------------|------------------------------|
| Spam | Rate limit 1/min por IP | CAPTCHA (complejidad alta) |
| Contenido inapropiado | Longitud mínima + máxima | Lista de palabras bloqueadas |
| Anonimato | Campo nombre obligatorio | — (intencionado) |
| Ediciones maliciosas | Solo añade secciones nuevas | Los admins de la wiki pueden revertir |

---

## Resumen de archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `src/shared/lib/wiki-comments.ts` | Crear — Server Action + funciones de lectura |
| `src/app/api/photo-comments/[title]/route.ts` | Crear — API route para leer comentarios |
| `src/features/gallery/components/PhotoComments.tsx` | Crear — componente UI |
| `src/features/gallery/components/PhotoDetailPanel.tsx` | Modificar — añadir `<PhotoComments>` |
| `src/features/gallery/components/PhotoDetailSheet.tsx` | Modificar — añadir `<PhotoComments>` |

**Tiempo estimado de implementación:** 1h 30min
