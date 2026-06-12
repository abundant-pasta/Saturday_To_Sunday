'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import {
  buildOutreachCampaign,
  buildOutreachUrl,
  discoverOutreachCandidates,
  generateOutreachDraft,
  sendOutreachEmail,
  type OutreachDiscoveryInput,
  type OutreachSport,
} from '@/lib/outreach'

function createAdminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  const isAuthorized = user && adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase()

  if (!isAuthorized) {
    throw new Error('Unauthorized')
  }

  return createAdminDb()
}

function clean(value?: string | null, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim()
}

function normalizeSport(value?: string | null): OutreachSport | null {
  if (value === 'football' || value === 'basketball' || value === 'both') return value
  return null
}

function sixDaysFromNow() {
  const date = new Date()
  date.setDate(date.getDate() + 6)
  return date.toISOString()
}

async function logOutreachEvent(
  adminDb: any,
  eventName: string,
  ids: { campaignId?: string | null; targetId?: string | null; messageId?: string | null },
  metadata: Record<string, unknown> = {}
) {
  await adminDb.from('outreach_events').insert({
    campaign_id: ids.campaignId || null,
    target_id: ids.targetId || null,
    message_id: ids.messageId || null,
    event_name: eventName,
    metadata,
  })
}

export async function ensureOutreachCampaign(adminDb: any, input: { school?: string | null; sport?: OutreachSport | null; themeKey?: string | null }) {
  const campaign = buildOutreachCampaign(input)
  const { data: existing } = await adminDb
    .from('outreach_campaigns')
    .select('*')
    .eq('key', campaign.key)
    .maybeSingle()

  if (existing) return existing

  const { data, error } = await adminDb
    .from('outreach_campaigns')
    .insert(campaign)
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to create outreach campaign: ${error.message}`)
  }

  return data
}

export async function runOutreachDiscovery(input: OutreachDiscoveryInput = {}) {
  const adminDb = await requireAdmin()
  return runOutreachDiscoveryForClient(adminDb, input)
}

export async function runOutreachDiscoveryForClient(adminDb: any, input: OutreachDiscoveryInput = {}) {
  const campaign = await ensureOutreachCampaign(adminDb, {
    school: input.school,
    sport: normalizeSport(input.sport || null),
    themeKey: input.themeKey,
  })

  const discovery = await discoverOutreachCandidates({
    school: campaign.school,
    sport: normalizeSport(campaign.sport),
    themeKey: campaign.theme_key,
    limit: input.limit || 24,
  })

  let inserted = 0
  let updated = 0
  let skipped = 0

  for (const candidate of discovery.candidates) {
    const existingByUrl = await adminDb
      .from('outreach_targets')
      .select('*')
      .eq('url', candidate.url)
      .maybeSingle()

    let existing = existingByUrl.data
    if (!existing && candidate.email) {
      const existingByEmail = await adminDb
        .from('outreach_targets')
        .select('*')
        .ilike('email', candidate.email)
        .maybeSingle()
      existing = existingByEmail.data
    }

    if (existing?.status === 'opted_out') {
      skipped++
      continue
    }

    const status = candidate.email || candidate.contactUrl ? 'enriched' : 'discovered'
    const payload = {
      source: candidate.source,
      platform: candidate.platform,
      display_name: candidate.displayName,
      url: candidate.url,
      email: candidate.email || existing?.email || null,
      contact_url: candidate.contactUrl || existing?.contact_url || null,
      school: candidate.school || campaign.school || null,
      sport: candidate.sport || campaign.sport || null,
      target_type: candidate.targetType,
      fit_score: candidate.fitScore,
      status: existing?.status === 'sent' || existing?.status === 'drafted' ? existing.status : status,
      last_checked_at: new Date().toISOString(),
      next_action_at: new Date().toISOString(),
      metadata: candidate.metadata || {},
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      const { error } = await adminDb
        .from('outreach_targets')
        .update(payload)
        .eq('id', existing.id)

      if (error) {
        skipped++
        continue
      }

      updated++
      await logOutreachEvent(adminDb, status === 'enriched' ? 'enriched' : 'discovered', { campaignId: campaign.id, targetId: existing.id }, { source: candidate.source })
      continue
    }

    const { data: target, error } = await adminDb
      .from('outreach_targets')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      skipped++
      continue
    }

    inserted++
    await logOutreachEvent(adminDb, status === 'enriched' ? 'enriched' : 'discovered', { campaignId: campaign.id, targetId: target.id }, { source: candidate.source })
  }

  revalidatePath('/admin/outreach')
  revalidatePath('/admin/growth')

  return {
    campaignId: campaign.id,
    inserted,
    updated,
    skipped,
    warnings: discovery.warnings,
  }
}

export async function generateOutreachDrafts(input: { campaignId?: string | null; limit?: number } = {}) {
  const adminDb = await requireAdmin()
  return generateOutreachDraftsForClient(adminDb, input)
}

export async function generateOutreachDraftsForClient(adminDb: any, input: { campaignId?: string | null; limit?: number } = {}) {
  const campaignsQuery = adminDb
    .from('outreach_campaigns')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(8)

  if (input.campaignId) campaignsQuery.eq('id', input.campaignId)

  const [{ data: campaigns, error: campaignError }, { data: targets, error: targetError }] = await Promise.all([
    campaignsQuery,
    adminDb
      .from('outreach_targets')
      .select('*')
      .in('status', ['enriched', 'opted_in'])
      .order('fit_score', { ascending: false })
      .limit(input.limit || 40),
  ])

  if (campaignError) throw new Error(campaignError.message)
  if (targetError) throw new Error(targetError.message)

  let drafted = 0
  let skipped = 0

  for (const campaign of campaigns || []) {
    for (const target of targets || []) {
      if (campaign.school && target.school && campaign.school.toLowerCase() !== target.school.toLowerCase()) continue
      if (!target.email && !target.contact_url) {
        skipped++
        continue
      }

      const { data: existing } = await adminDb
        .from('outreach_messages')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('target_id', target.id)
        .neq('status', 'skipped')
        .maybeSingle()

      if (existing) {
        skipped++
        continue
      }

      const draft = generateOutreachDraft(campaign, target)
      const { data: message, error } = await adminDb
        .from('outreach_messages')
        .insert({
          campaign_id: campaign.id,
          target_id: target.id,
          channel: draft.channel,
          subject: draft.subject,
          body: draft.body,
          campaign_url: draft.campaignUrl,
          status: 'drafted',
          metadata: { target_type: target.target_type, school: target.school },
        })
        .select('id')
        .single()

      if (error) {
        skipped++
        continue
      }

      drafted++
      await adminDb.from('outreach_targets').update({ status: target.status === 'opted_in' ? 'opted_in' : 'drafted', updated_at: new Date().toISOString() }).eq('id', target.id)
      await logOutreachEvent(adminDb, 'drafted', { campaignId: campaign.id, targetId: target.id, messageId: message.id })
    }
  }

  revalidatePath('/admin/outreach')
  return { drafted, skipped }
}

export async function approveOutreachMessage(messageId: string) {
  const adminDb = await requireAdmin()
  const { data, error } = await adminDb
    .from('outreach_messages')
    .update({ status: 'approved', approved_at: new Date().toISOString(), error: null })
    .eq('id', messageId)
    .select('campaign_id, target_id')
    .single()

  if (error) throw new Error(error.message)
  await logOutreachEvent(adminDb, 'approved', { campaignId: data.campaign_id, targetId: data.target_id, messageId })
  revalidatePath('/admin/outreach')
  return { success: true }
}

export async function skipOutreachMessage(messageId: string) {
  const adminDb = await requireAdmin()
  const { data, error } = await adminDb
    .from('outreach_messages')
    .update({ status: 'skipped' })
    .eq('id', messageId)
    .select('campaign_id, target_id')
    .single()

  if (error) throw new Error(error.message)
  await logOutreachEvent(adminDb, 'skipped', { campaignId: data.campaign_id, targetId: data.target_id, messageId })
  revalidatePath('/admin/outreach')
  return { success: true }
}

export async function regenerateOutreachMessage(messageId: string) {
  const adminDb = await requireAdmin()
  const { data: message, error } = await adminDb
    .from('outreach_messages')
    .select('*, outreach_campaigns(*), outreach_targets(*)')
    .eq('id', messageId)
    .single()

  if (error) throw new Error(error.message)

  const campaign = Array.isArray(message.outreach_campaigns) ? message.outreach_campaigns[0] : message.outreach_campaigns
  const target = Array.isArray(message.outreach_targets) ? message.outreach_targets[0] : message.outreach_targets
  const draft = generateOutreachDraft(campaign, target)

  const { error: updateError } = await adminDb
    .from('outreach_messages')
    .update({
      subject: draft.subject,
      body: draft.body,
      campaign_url: draft.campaignUrl,
      status: 'drafted',
      approved_at: null,
      error: null,
    })
    .eq('id', messageId)

  if (updateError) throw new Error(updateError.message)
  await logOutreachEvent(adminDb, 'regenerated', { campaignId: campaign.id, targetId: target.id, messageId })
  revalidatePath('/admin/outreach')
  return { success: true }
}

export async function markOutreachTargetOptOut(targetId: string) {
  const adminDb = await requireAdmin()
  const { error } = await adminDb
    .from('outreach_targets')
    .update({ status: 'opted_out', next_action_at: null, updated_at: new Date().toISOString() })
    .eq('id', targetId)

  if (error) throw new Error(error.message)

  await adminDb
    .from('outreach_messages')
    .update({ status: 'skipped', error: 'Target opted out' })
    .eq('target_id', targetId)
    .in('status', ['drafted', 'approved', 'failed'])

  await logOutreachEvent(adminDb, 'opted_out', { targetId })
  revalidatePath('/admin/outreach')
  return { success: true }
}

export async function sendApprovedOutreachMessages(messageIds?: string[]) {
  const adminDb = await requireAdmin()
  return sendApprovedOutreachMessagesForClient(adminDb, messageIds)
}

export async function sendApprovedOutreachMessagesForClient(adminDb: any, messageIds?: string[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count: sentToday } = await adminDb
    .from('outreach_messages')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', today.toISOString())

  const remaining = Math.max(0, 15 - (sentToday || 0))
  if (remaining === 0) return { sent: 0, failed: 0, disabled: false, message: 'Daily send cap reached.' }

  const query = adminDb
    .from('outreach_messages')
    .select('*, outreach_targets(*), outreach_campaigns(*)')
    .eq('status', 'approved')
    .eq('channel', 'email')
    .order('approved_at', { ascending: true })
    .limit(remaining)

  if (messageIds?.length) query.in('id', messageIds)

  const { data: messages, error } = await query
  if (error) throw new Error(error.message)

  let sent = 0
  let failed = 0
  let disabled = false

  for (const message of messages || []) {
    const target = Array.isArray(message.outreach_targets) ? message.outreach_targets[0] : message.outreach_targets
    const campaign = Array.isArray(message.outreach_campaigns) ? message.outreach_campaigns[0] : message.outreach_campaigns

    if (!target?.email || target.status === 'opted_out') {
      failed++
      await adminDb.from('outreach_messages').update({ status: 'failed', error: 'No sendable email or target opted out' }).eq('id', message.id)
      continue
    }

    const result = await sendOutreachEmail({ to: target.email, subject: message.subject, body: message.body })
    if (result.disabled) {
      disabled = true
      break
    }

    if (!result.sent) {
      failed++
      await adminDb.from('outreach_messages').update({ status: 'failed', error: result.error || 'Email provider failed' }).eq('id', message.id)
      await logOutreachEvent(adminDb, 'failed', { campaignId: campaign?.id, targetId: target.id, messageId: message.id }, { error: result.error })
      continue
    }

    sent++
    await adminDb
      .from('outreach_messages')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        followup_after: sixDaysFromNow(),
        error: null,
        metadata: { ...(message.metadata || {}), provider_id: result.id || null },
      })
      .eq('id', message.id)

    await adminDb
      .from('outreach_targets')
      .update({ status: 'sent', next_action_at: sixDaysFromNow(), updated_at: new Date().toISOString() })
      .eq('id', target.id)

    await logOutreachEvent(adminDb, 'sent', { campaignId: campaign?.id, targetId: target.id, messageId: message.id }, { provider_id: result.id || null })
  }

  revalidatePath('/admin/outreach')
  revalidatePath('/admin/growth')
  return {
    sent,
    failed,
    disabled,
    message: disabled ? 'Email sending is disabled until Resend outreach env vars are set.' : undefined,
  }
}

export async function createCreatorLead(input: {
  school: string
  sport: OutreachSport
  platform: string
  email: string
  handle?: string | null
}) {
  const email = clean(input.email).toLowerCase()
  if (!email || !email.includes('@')) throw new Error('A valid email is required')

  const adminDb = createAdminDb()
  const campaign = await ensureOutreachCampaign(adminDb, {
    school: input.school,
    sport: normalizeSport(input.sport) || 'football',
    themeKey: 'school_spotlight',
  })

  const displayName = clean(input.handle, `${input.school} creator`)
  const url = `creator:${input.platform}:${email}`

  const { data: existing } = await adminDb
    .from('outreach_targets')
    .select('*')
    .ilike('email', email)
    .maybeSingle()

  const targetPayload = {
    source: 'creator_portal',
    platform: clean(input.platform, 'creator'),
    display_name: displayName,
    url,
    email,
    contact_url: null,
    school: clean(input.school),
    sport: input.sport,
    target_type: 'creator',
    fit_score: 75,
    status: 'opted_in',
    last_checked_at: new Date().toISOString(),
    next_action_at: new Date().toISOString(),
    metadata: { handle: input.handle || null, optedInAt: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  }

  const target = existing
    ? (await adminDb.from('outreach_targets').update(targetPayload).eq('id', existing.id).select('*').single()).data
    : (await adminDb.from('outreach_targets').insert(targetPayload).select('*').single()).data

  const campaignUrl = buildOutreachUrl(campaign, target)
  const draft = generateOutreachDraft(campaign, target)

  const { data: existingMessage } = await adminDb
    .from('outreach_messages')
    .select('id')
    .eq('campaign_id', campaign.id)
    .eq('target_id', target.id)
    .maybeSingle()

  const messagePayload = {
      campaign_id: campaign.id,
      target_id: target.id,
      channel: 'email',
      subject: draft.subject,
      body: draft.body,
      campaign_url: campaignUrl,
      status: 'drafted',
      metadata: { opted_in: true, source: 'creator_portal' },
    }

  if (existingMessage) {
    await adminDb.from('outreach_messages').update(messagePayload).eq('id', existingMessage.id)
  } else {
    await adminDb.from('outreach_messages').insert(messagePayload)
  }

  await logOutreachEvent(adminDb, 'discovered', { campaignId: campaign.id, targetId: target.id }, { source: 'creator_portal', opted_in: true })
  revalidatePath('/admin/outreach')

  return {
    campaignUrl,
    shareCopy: `I made a ${input.school} alumni challenge. Can you beat my score? ${campaignUrl}`,
  }
}
