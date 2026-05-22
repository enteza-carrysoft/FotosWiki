import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const dynamic = 'force-static'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1c1409 0%, #2a1810 100%)',
          color: '#c9a84c',
          fontSize: 350,
          fontWeight: 700,
          fontFamily: 'serif',
          letterSpacing: '-0.04em',
        }}
      >
        M
      </div>
    ),
    { width: 512, height: 512 }
  )
}
