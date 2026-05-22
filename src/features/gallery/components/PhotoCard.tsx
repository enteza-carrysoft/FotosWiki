import type { PhotoThumb } from '@/shared/types/wiki.types'

interface Props {
  photo: PhotoThumb
  onClick: (photo: PhotoThumb) => void
  selected?: boolean
}

export default function PhotoCard({ photo, onClick, selected }: Props) {
  return (
    <button
      onClick={() => onClick(photo)}
      className={`group relative block w-full overflow-hidden rounded-lg bg-stone-800 aspect-[4/3] active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 ${
        selected ? 'ring-2 ring-amber-400 brightness-75' : ''
      }`}
      aria-label={`Ver foto ${photo.title}`}
      aria-pressed={selected}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbUrl}
        alt={photo.title}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover transition-opacity"
      />
      {/* Always-visible gradient + title — readable on mobile (no hover needed) */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent pt-6 pb-1.5 px-1.5">
        <span className="block text-white text-[10px] leading-tight font-medium line-clamp-2 text-left drop-shadow">
          {photo.title}
        </span>
      </div>
    </button>
  )
}
