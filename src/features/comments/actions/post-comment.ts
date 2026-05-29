'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { publishCommentToWiki } from '@/shared/lib/wiki-comments'
import type { PostCommentResult } from '@/shared/types/wiki-comment.types'

const CommentSchema = z.object({
  photoTitle: z.string().min(1).max(255),
  author: z
    .string()
    .trim()
    .min(2, 'El nombre es demasiado corto')
    .max(60, 'El nombre es demasiado largo'),
  text: z
    .string()
    .trim()
    .min(5, 'El comentario es demasiado corto')
    .max(500, 'El comentario es demasiado largo (máx. 500)'),
})

// ─── Moderación básica ───────────────────────────────────────────────────────

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
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error de red'
    return { ok: false, error: msg }
  }
}
