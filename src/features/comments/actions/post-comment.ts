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

const RATE_LIMIT_MS = 60_000
const lastPostByIp = new Map<string, number>()

function getClientIp(h: Headers): string {
  const xff = h.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return h.get('x-real-ip') ?? 'unknown'
}

export async function postPhotoComment(input: {
  photoTitle: string
  author: string
  text: string
}): Promise<PostCommentResult> {
  const parsed = CommentSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

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
