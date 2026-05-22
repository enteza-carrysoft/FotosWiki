import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1c1409',
          color: '#c9a84c',
          fontSize: 24,
          fontWeight: 700,
          fontFamily: 'serif',
        }}
      >
        M
      </div>
    ),
    size
  )
}
