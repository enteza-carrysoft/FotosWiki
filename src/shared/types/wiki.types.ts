export interface PhotoThumb {
  title: string
  thumbUrl: string
  wikiUrl: string
}

export interface WikiPhoto {
  pageId: number
  title: string
  description: string
  date: string
  author: string
  origin: string
  persons: string
  categories: string[]
  imageUrl: string
  thumbUrl: string
  wikiUrl: string
}

export interface CategoryMember {
  pageid: number
  ns: number
  title: string
}

export interface PhotoIndex {
  lastUpdated: number
  titles: string[]
  total: number
}
