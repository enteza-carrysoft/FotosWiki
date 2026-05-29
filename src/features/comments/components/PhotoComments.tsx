'use client'

import { useState } from 'react'
import { usePhotoComments } from '../hooks/usePhotoComments'
import CommentForm from './CommentForm'

interface Props {
  photoTitle: string
}

export default function PhotoComments({ photoTitle }: Props) {
  const { comments, loading, error, addOptimistic, reload } = usePhotoComments(photoTitle)
  const [showForm, setShowForm] = useState(false)
  const [justSent, setJustSent] = useState(false)

  return (
    <section className="border-t border-stone-800 pt-4 mt-4">
      <h3 className="text-stone-400 text-xs uppercase tracking-wider mb-3">
        Comentarios{loading ? ' …' : ` (${comments.length})`}
      </h3>

      {error && (
        <p className="text-red-400 text-xs mb-2">
          No se pudieron cargar los comentarios.{' '}
          <button onClick={reload} className="underline">
            Reintentar
          </button>
        </p>
      )}

      {comments.length === 0 && !loading && !error && (
        <p className="text-stone-500 text-sm mb-3">Sé el primero en comentar esta foto.</p>
      )}

      <ul className="flex flex-col gap-2">
        {comments.map((c, i) => (
          <li key={`${c.author}-${i}`} className="bg-stone-800/50 rounded-lg p-3">
            <p className="text-white text-sm whitespace-pre-wrap">{c.text}</p>
            <p className="text-stone-500 text-xs mt-1">
              — {c.author}
              {c.date ? ` · ${c.date}` : ''}
            </p>
          </li>
        ))}
      </ul>

      {justSent && (
        <p className="text-green-400 text-xs mt-2">¡Comentario enviado!</p>
      )}

      {showForm ? (
        <CommentForm
          photoTitle={photoTitle}
          onCancel={() => setShowForm(false)}
          onSent={(c) => {
            addOptimistic(c)
            setShowForm(false)
            setJustSent(true)
            setTimeout(() => setJustSent(false), 3000)
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-3 text-amber-400/80 text-sm hover:text-amber-400 active:text-amber-300"
        >
          + Añadir comentario
        </button>
      )}
    </section>
  )
}
