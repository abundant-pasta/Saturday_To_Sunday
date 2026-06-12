# Social Platform Automation Setup

This is the safe foundation for TikTok, Instagram, and YouTube Shorts in Social Autopilot. The production posture is manual posting packs first, direct autoposting only after each platform account, app, review, and audit path is complete.

## What Is Automated Now

The `/admin/social` workflow can already generate platform-specific draft packs for TikTok, Instagram, and YouTube Shorts:

- Platform captions with campaign links and `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `social_post_id`.
- Short-form scripts with hook, reveal timing, CTA, and link/caption guidance.
- Static square social cards at `/api/social-card?post_id=...`.
- Static vertical cards for TikTok, Instagram Reels/stories, and YouTube Shorts at `/api/social-card?post_id=...&format=vertical`.
- Admin review states: drafted, approved, scheduled, skipped, copied, manually posted, failed.
- Manual posting attribution through `social_post_events`, `growth_events`, campaign URLs, and `social_post_id`.

Direct publishing is intentionally not enabled for these three platforms yet. Treat TikTok, Instagram, and YouTube as copy/export posting packs until the account owner can prove platform compliance and keep an audit trail.

## Why Direct Autoposting Is Gated

TikTok, Instagram, and YouTube all allow some form of API-driven publishing, but none should be treated as a simple server-side cron publish button:

- TikTok Direct Post requires explicit creator consent, mandatory UX controls, and audit before public direct posts. Unaudited clients are restricted to private/self-only behavior and low user caps.
- Instagram publishing requires a Meta app, a supported Instagram professional account or current Instagram business login path, approved permissions, and a two-step media container/publish flow.
- YouTube uploads use the Data API `videos.insert` endpoint, but new or unverified API projects can have uploads forced private until the project passes YouTube API Services audit.

The safe rule: never add non-X direct posting until the platform app is reviewed, the admin UI shows the exact destination account and privacy setting, and every publish attempt is logged with the external post ID or platform error.

## TikTok Setup

Recommended phase now: export pack only.

Required before direct publishing:

- Create a TikTok for Developers app for Saturday to Sunday.
- Configure OAuth redirect URLs for the production domain and local callback.
- Request Content Posting API access and the Direct Post permission/scope used by the direct post endpoint.
- Build a TikTok-specific export/publish screen that retrieves creator info before rendering publish controls.
- Show the connected TikTok nickname, available privacy options, commercial content disclosure, comment/duet/stitch controls, and TikTok music usage confirmation.
- Submit the API client for TikTok audit before allowing public direct posts.

Future credentials/env vars:

```text
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=
TIKTOK_WEBHOOK_SECRET=
```

Per-account OAuth access and refresh tokens should be stored encrypted or in a secrets store, not as shared global env vars.

Official docs:

- [Content Posting API overview](https://developers.tiktok.com/doc/content-posting-api-get-started/)
- [Direct Post API](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post/)
- [Content sharing guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines/)

## Instagram Setup

Recommended phase now: export pack only.

Required before direct publishing:

- Create or use a Meta developer app owned by the Saturday to Sunday business/admin account.
- Decide the auth path before implementation:
  - Instagram API with Instagram Login for the current Meta-supported Instagram business login path.
  - Instagram API with Facebook Login if using a Facebook Page connected to an Instagram professional account.
- Convert the destination Instagram account to a professional account if needed.
- Connect the account to the relevant Meta business assets/Page when using the Facebook Login path.
- Request the current publishing permissions required by Meta for the chosen auth path. For the Facebook Login path, expect permissions like `instagram_basic`, `instagram_content_publish`, and relevant Page permissions. For the Instagram Login path, confirm the current business permissions in Meta docs before coding.
- Pass Meta App Review for every requested permission before production use outside developer/test accounts.
- Host video assets at a public, platform-readable HTTPS URL before creating media containers.

Future credentials/env vars:

```text
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=
INSTAGRAM_REDIRECT_URI=
INSTAGRAM_ACCOUNT_ID=
INSTAGRAM_WEBHOOK_SECRET=
```

Per-account tokens, selected Instagram account IDs, Page IDs, and publish permission status should live in encrypted account metadata or a secrets store.

Official docs:

- [Instagram Platform overview](https://developers.facebook.com/docs/instagram-platform/overview/)
- [Instagram content publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/)
- [Meta App Review](https://developers.facebook.com/docs/app-review/)

## YouTube Shorts Setup

Recommended phase now: export pack only.

Required before direct publishing:

- Create a Google Cloud project owned by the Saturday to Sunday admin/business account.
- Enable the YouTube Data API v3.
- Configure OAuth consent, redirect URLs, scopes, and test users.
- Use the minimum upload scope, normally `https://www.googleapis.com/auth/youtube.upload`.
- Connect the destination YouTube channel through OAuth and store refresh tokens securely.
- Upload only videos that meet Shorts shape expectations: square or vertical, up to 3 minutes.
- Keep privacy explicit in the admin UI. For unverified API projects, expect uploaded videos to be private until YouTube audit/compliance is complete.
- Submit the project for YouTube API Services audit before relying on public scheduled uploads.

Future credentials/env vars:

```text
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=
YOUTUBE_REFRESH_TOKEN=
YOUTUBE_CHANNEL_ID=
```

Per-channel refresh tokens should be stored encrypted or in a secrets store.

Official docs:

- [YouTube Data API uploads](https://developers.google.com/youtube/v3/guides/uploading_a_video)
- [videos.insert reference](https://developers.google.com/youtube/v3/docs/videos/insert)
- [Upload YouTube Shorts](https://support.google.com/youtube/answer/12779649)
- [Quota and compliance audits](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits)
- [Audit and quota extension form](https://support.google.com/youtube/contact/yt_api_form)
- [YouTube API Services Developer Policies](https://developers.google.com/youtube/terms/developer-policies)

## Review And Audit Controls

Before enabling direct publishing for any non-X platform, require:

- Admin approval for every post before it can be posted by API.
- A visible destination account, platform, post type, campaign URL, scheduled time, and privacy setting.
- A manual override to keep any post as copy/export only.
- Stored event history for copied, approved, scheduled, attempted, posted, failed, and manually posted states.
- External post ID or platform error saved on every API attempt.
- Token revoke/disconnect flow documented in the UI and privacy policy.
- Rate-limit handling and backoff per platform.
- No platform credentials in client-side code, logs, screenshots, or generated posting packs.

## Private And Restricted Modes

Use these modes while apps are unaudited or under review:

- TikTok: keep Direct Post disabled for production. If testing the API, assume private/self-only restrictions until audit approval.
- Instagram: keep publishing limited to developer/test accounts until permissions pass App Review.
- YouTube: expect uploads from unverified API projects to be private; use manual YouTube Studio uploads for public Shorts until audit is complete.

## Recommended Rollout Order

1. Keep current copy/export packs live for TikTok, Instagram, and YouTube Shorts.
2. Add admin documentation for manual posting SOPs: where to copy caption, where to download or record the asset, and how to paste the campaign link.
3. Add secure credential storage and OAuth connection records without enabling direct post buttons.
4. Implement read-only account connection checks: connected handle/channel, permission status, token health, and review/audit status.
5. Implement private/test direct publishing for one platform at a time, starting with YouTube if the workflow is first-party channel only.
6. Submit audit/review evidence with screencasts showing consent, account selection, privacy controls, and logs.
7. Enable production direct publishing only after approval, behind an admin-only feature flag per platform.

Default production rule until then: export packs are the product; direct autoposting is a gated future capability.
