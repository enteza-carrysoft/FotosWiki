'use client'

import { useState } from 'react'
import { postPhotoComment } from '../actions/post-comment'
import type { WikiComment } from '@/shared/types/wiki-comment.types'

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
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setError(null)
              }}
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
      ) : (
        <button
          type="button"
          onClick={() => {
            setSent(false)
            setShowForm(true)
          }}
          className="text-amber-400/80 text-sm hover:text-amber-400 active:text-amber-300"
        >
          + Añadir comentario
        </button>
      )}
    </section>
  )
}
