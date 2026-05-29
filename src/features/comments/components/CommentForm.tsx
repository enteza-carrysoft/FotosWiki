'use client'

import { useState } from 'react'
import { postPhotoComment } from '../actions/post-comment'
import type { WikiComment } from '@/shared/types/wiki-comment.types'

interface Props {
  photoTitle: string
  onSent: (c: WikiComment) => void
  onCancel: () => void
}

export default function CommentForm({ photoTitle, onSent, onCancel }: Props) {
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSend = name.trim().length >= 2 && text.trim().length >= 5 && !sending

  const handleSubmit = async () => {
    if (!canSend) return
    setSending(true)
    setError(null)
    const result = await postPhotoComment({ photoTitle, author: name, text })
    setSending(false)
    if (result.ok && result.comment) {
      onSent(result.comment)
      setName('')
      setText('')
    } else {
      setError(result.error ?? 'No se pudo enviar')
    }
  }

  return (
    <div className="flex flex-col gap-2 mt-3">
      <p className="text-stone-500 text-xs leading-relaxed">
        Tu comentario se guardará públicamente en la página de discusión de esta foto en
        mairenawiki.es. Los administradores pueden editarlo o borrarlo.
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
      <div className="flex justify-between items-center text-stone-500 text-xs">
        <span>{text.length}/500</span>
        {error && <span className="text-red-400">{error}</span>}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-9 rounded-lg border border-stone-600 text-stone-400 text-sm active:bg-stone-800"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSend}
          className="flex-1 h-9 rounded-lg bg-amber-500 text-black text-sm font-bold disabled:opacity-40 active:bg-amber-400"
        >
          {sending ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </div>
  )
}
