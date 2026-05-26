import { parseWikitext } from './wikitext-parser'

export type PhotoYearSource = 'fecha-or-ano' | 'category' | 'none'

export interface PhotoYearResolution {
  year: number | null
  source: PhotoYearSource
}

const YEAR_REGEX = /(18|19|20)\d{2}/

const DECADE_FOUR_DIGIT_REGEX = /((?:18|19|20)\d)0s\b/i
const DECADE_WORD_REGEX = /(?:d[eé]cada\s*(?:de)?|a(?:n|ñ)os?)\s*(?:del?\s*)?(\d{2}|(?:18|19|20)\d{2})/i

function normalizeText(value: string): string {
  return value
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/<[^>]+>/g, '')
    .trim()
}

function clampYear(year: number): number | null {
  if (!Number.isInteger(year)) return null
  if (year < 1800 || year > 2099) return null
  return year
}

function extractYearFromRange(value: string): number | null {
  const m = value.match(/((?:18|19|20)\d{2})\s*[-–/]\s*(\d{2,4})/)
  if (!m) return null
  const first = Number(m[1])
  return clampYear(first)
}

function extractYearFromTwoDigit(value: string): number | null {
  const m = value.match(/(?:a(?:n|ñ)os?|d[eé]cada(?:\s+de)?)\s*(\d{2})\b/i)
  if (!m) return null
  const year = 1900 + Number(m[1])
  return clampYear(year)
}

export function extractYearFromText(value: string): number | null {
  const clean = normalizeText(value)

  const fromRange = extractYearFromRange(clean)
  if (fromRange) return fromRange

  const directYear = clean.match(YEAR_REGEX)
  if (directYear) {
    return clampYear(Number(directYear[0]))
  }

  const fourDigitDecade = clean.match(DECADE_FOUR_DIGIT_REGEX)
  if (fourDigitDecade) {
    const decade = Number(`${fourDigitDecade[1]}0`)
    return Number.isInteger(decade) ? decade : null
  }

  const decadeWord = clean.match(DECADE_WORD_REGEX)
  if (decadeWord) {
    const raw = decadeWord[1]
    if (raw.length === 4) {
      const decade = Math.floor(Number(raw) / 10) * 10
      return clampYear(decade)
    }

    const twoDigit = Number(raw)
    if (Number.isInteger(twoDigit)) {
      return clampYear(1900 + twoDigit)
    }
  }

  const fromTwoDigit = extractYearFromTwoDigit(clean)
  if (fromTwoDigit) return fromTwoDigit

  return null
}

function extractFieldLine(wikitext: string, fieldRegex: RegExp): string {
  for (const line of wikitext.split('\n')) {
    const trimmed = line.trim()
    const bullet = trimmed.match(new RegExp(`^\\*\\s*${fieldRegex.source}\\s*:\\s*(.+)$`, 'i'))
    if (bullet) return bullet[1].trim()

    const template = trimmed.match(new RegExp(`^\\|\\s*${fieldRegex.source}\\s*=\\s*(.+)$`, 'i'))
    if (template) return template[1].trim()

    const bold = trimmed.match(new RegExp(`^'''\\s*${fieldRegex.source}\\s*'''\\s*:\\s*(.+)$`, 'i'))
    if (bold) return bold[1].trim()
  }
  return ''
}

export function extractYearFromCategoryList(categories: string[]): number | null {
  for (const category of categories) {
    const match = category.match(/(?:^|\s)Foto\s+((?:18|19|20)\d{2})(?:\s|$)/i)
    if (match) {
      const year = clampYear(Number(match[1]))
      if (year) return year
    }

    const generic = extractYearFromText(category)
    if (generic) return generic
  }
  return null
}

export function decadeLabelFromYear(year: number): string {
  const decade = Math.floor(year / 10) * 10
  return `${decade}s`
}

export function resolvePhotoYearFromWikitext(wikitext: string): PhotoYearResolution {
  const meta = parseWikitext(wikitext)

  const fechaRaw = extractFieldLine(wikitext, /Fecha/)
  const anoRaw = extractFieldLine(wikitext, /A[nñ]o/)

  const yearFromFechaOrAno =
    extractYearFromText(fechaRaw) ||
    extractYearFromText(anoRaw) ||
    extractYearFromText(meta.date)
  if (yearFromFechaOrAno) return { year: yearFromFechaOrAno, source: 'fecha-or-ano' }

  const titleMatch = wikitext.match(/\[\[Categor[ií]a:[^\]]+\]\]/)
  if (titleMatch) {
    const yearFromCategoryText = extractYearFromText(titleMatch[0])
    if (yearFromCategoryText) return { year: yearFromCategoryText, source: 'category' }
  }

  const categoryMatches = [...wikitext.matchAll(/\[\[Categor[ií]a:([^\]]+)\]\]/gi)].map((m) =>
    m[1].trim()
  )
  const yearFromCategory = extractYearFromCategoryList(categoryMatches)
  if (yearFromCategory) return { year: yearFromCategory, source: 'category' }

  return { year: null, source: 'none' }
}
