import type { MetadataRoute } from 'next'

function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'https://fotoswiki.vercel.app'
}

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
