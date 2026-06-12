-- Collapse user-facing image reports to a single "bad photo" issue.

ALTER TABLE public.image_audit_reports
  DROP CONSTRAINT IF EXISTS image_audit_reports_issue_type_check;

ALTER TABLE public.image_audit_reports
  ADD CONSTRAINT image_audit_reports_issue_type_check
  CHECK (issue_type IN ('bad_photo', 'wrong_person', 'college_spoiler', 'broken_image', 'other'));
