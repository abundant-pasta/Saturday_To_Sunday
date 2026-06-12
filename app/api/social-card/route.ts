import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatPlatform, formatPostType } from '@/lib/social'

export const dynamic = 'force-dynamic'

function escapeXml(value: unknown) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function splitLines(value: string, maxChars = 34, maxLines = 4) {
  const words = value.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (next.length > maxChars && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
    if (lines.length === maxLines) break
  }

  if (line && lines.length < maxLines) lines.push(line)
  return lines
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const postId = searchParams.get('post_id')
  const format = searchParams.get('format') === 'vertical' ? 'vertical' : 'square'
  const adminDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: post } = postId
    ? await adminDb
      .from('social_posts')
      .select('id, platform, post_type, caption, campaign_url, social_campaigns(name, school, theme_key)')
      .eq('id', postId)
      .maybeSingle()
    : { data: null }

  const campaign = Array.isArray(post?.social_campaigns) ? post?.social_campaigns[0] : post?.social_campaigns
  const platform = formatPlatform((post?.platform || 'x') as any)
  const postType = formatPostType((post?.post_type || 'guess_college') as any)
  const title = campaign?.school ? `${campaign.school} Alumni Challenge` : campaign?.name || 'Saturday to Sunday'
  const captionLines = splitLines(
    post?.caption || 'You know the player. Do you know the school?',
    format === 'vertical' ? 28 : 34,
    format === 'vertical' ? 6 : 4
  )
  const url = post?.campaign_url || 'playsaturdaytosunday.com'
  const width = 1080
  const height = format === 'vertical' ? 1920 : 1080
  const borderHeight = format === 'vertical' ? 1816 : 976
  const titleY = format === 'vertical' ? 430 : 352
  const captionY = format === 'vertical' ? 580 : 470
  const captionStep = format === 'vertical' ? 66 : 58
  const buttonY = format === 'vertical' ? 1490 : 798
  const footerY = format === 'vertical' ? 1740 : 978
  const titleSize = format === 'vertical' ? 76 : 82

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#06110d"/>
      <stop offset="0.55" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#2a1d09"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect x="52" y="52" width="976" height="${borderHeight}" rx="36" fill="none" stroke="#22d3ee" stroke-opacity="0.45" stroke-width="4"/>
  <text x="92" y="134" fill="#fde68a" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" letter-spacing="6">SATURDAY TO SUNDAY</text>
  <text x="92" y="204" fill="#67e8f9" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="900" letter-spacing="5">${escapeXml(platform)} / ${escapeXml(postType).toUpperCase()}</text>
  <text x="92" y="${titleY}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="${titleSize}" font-weight="900">${escapeXml(title)}</text>
  ${captionLines.map((line, index) => `<text x="96" y="${captionY + index * captionStep}" fill="#cbd5e1" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700">${escapeXml(line)}</text>`).join('\n  ')}
  ${format === 'vertical' ? '<text x="96" y="1260" fill="#67e8f9" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="900">YOU KNOW THE PLAYER.</text>\n  <text x="96" y="1320" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="900">DO YOU KNOW THE SCHOOL?</text>' : ''}
  <rect x="92" y="${buttonY}" width="896" height="112" rx="24" fill="#22d3ee"/>
  <text x="132" y="${buttonY + 69}" fill="#020617" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="900">PLAY THE GRID</text>
  <text x="92" y="${footerY}" fill="#94a3b8" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700">${escapeXml(url.replace(/^https?:\/\//, '')).slice(0, 90)}</text>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
