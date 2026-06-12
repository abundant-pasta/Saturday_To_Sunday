UPDATE public.social_accounts
SET
  handle = '@PlayS2S',
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'fallback_handles', jsonb_build_array('@PlayS2S', '@PlaySatToSun', '@SaturdayToSundayGame'),
    'setup_status', CASE
      WHEN platform = 'x' THEN 'direct_publish_supported_with_credentials'
      ELSE 'posting_pack_first'
    END
  ),
  updated_at = now()
WHERE platform IN ('x', 'tiktok', 'instagram', 'youtube');

INSERT INTO public.social_accounts (platform, handle, status, publish_capability, metadata)
VALUES
  ('x', '@PlayS2S', 'needs_setup', 'direct', '{"fallback_handles":["@PlayS2S","@PlaySatToSun","@SaturdayToSundayGame"],"setup_status":"direct_publish_supported_with_credentials"}'::jsonb),
  ('tiktok', '@PlayS2S', 'needs_setup', 'copy_export', '{"fallback_handles":["@PlayS2S","@PlaySatToSun","@SaturdayToSundayGame"],"setup_status":"posting_pack_first"}'::jsonb),
  ('instagram', '@PlayS2S', 'needs_setup', 'copy_export', '{"fallback_handles":["@PlayS2S","@PlaySatToSun","@SaturdayToSundayGame"],"setup_status":"posting_pack_first"}'::jsonb),
  ('youtube', '@PlayS2S', 'needs_setup', 'copy_export', '{"fallback_handles":["@PlayS2S","@PlaySatToSun","@SaturdayToSundayGame"],"setup_status":"posting_pack_first"}'::jsonb)
ON CONFLICT DO NOTHING;
