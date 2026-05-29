import { NextResponse, type NextRequest } from 'next/server'
import { readCommentsFromWiki } from '@/shared/lib/wiki-comments'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ title: string }> }
) {
  const { title } = await params
  const photoTitle = decodeURIComponent(title)
  const comments = await readCommentsFromWiki(photoTitle)
  return NextResponse.json(
    { comments },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    }
  )
}
