import { MetadataRoute } from 'next'
import { GUIDE_ARTICLES } from '@/lib/guides-data'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://playsaturdaytosunday.com'

    // Dynamic routes for guides
    const guideUrls = GUIDE_ARTICLES.map((guide) => ({
        url: `${baseUrl}/guides/${guide.slug}`,
        lastModified: new Date(guide.date),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }))

    // Static routes
    const staticUrls = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 1,
        },
        {
            url: `${baseUrl}/guides`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        },
        {
            url: `${baseUrl}/support`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.5,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: new Date('2026-01-06'),
            changeFrequency: 'yearly' as const,
            priority: 0.3,
        },
        {
            url: `${baseUrl}/termsofservice`,
            lastModified: new Date('2026-01-06'),
            changeFrequency: 'yearly' as const,
            priority: 0.3,
        },
    ]

    return [...staticUrls, ...guideUrls]
}
