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
      className={`relative block w-full overflow-hidden rounded-lg bg-stone-800 aspect-[4/3] hover:opacity-90 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 ${
        selected ? 'ring-2 ring-amber-400 brightness-75' : ''
      }`}
      aria-label={`Ver foto ${photo.title}`}
      aria-pressed={selected}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbUrl}
        srcSet={`${photo.thumbUrlSm} 200w, ${photo.thumbUrl} 400w`}
        sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 17vw"
        alt={photo.title}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-end">
        <span className="opacity-0 hover:opacity-100 transition-opacity text-white text-xs px-2 py-1 truncate w-full">
          {photo.title}
        </span>
      </div>
    </button>
  )
}
