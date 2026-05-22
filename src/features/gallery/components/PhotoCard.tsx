import Image from 'next/image'
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
      <Image
        src={photo.thumbUrl}
        alt={photo.title}
        fill
        sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw"
        className="object-cover"
        loading="lazy"
      />
      {/* Always-visible gradient + title */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent pt-6 pb-1.5 px-1.5 pointer-events-none">
        <span className="block text-white text-[10px] leading-tight font-medium line-clamp-2 text-left drop-shadow">
          {photo.title}
        </span>
      </div>
    </button>
  )
}
