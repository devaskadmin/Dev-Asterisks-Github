-- =============================================================================
-- WorkoutAtlas v0.86.2 – External Authentication User Fields
-- Migration: 20260905_users_external_auth.sql
-- Purpose:   Prepare users table for external authentication providers (Google first).
--
-- Notes:
--   - Existing password users remain unchanged and continue to authenticate normally.
--   - Password column becomes nullable so external-auth-only users can exist
--     without a placeholder password hash.
--   - Composite unique index prevents duplicate external identities per provider.
-- =============================================================================

ALTER TABLE users
  MODIFY COLUMN Password VARCHAR(255) NULL,
  ADD COLUMN external_auth TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN external_auth_provider VARCHAR(50) NULL,
  ADD COLUMN external_auth_subject VARCHAR(255) NULL,
  ADD COLUMN external_auth_linked_at DATETIME NULL,
  ADD UNIQUE KEY ux_users_external_auth_identity (external_auth_provider, external_auth_subject),
  ADD KEY idx_users_external_auth (external_auth),
  ADD KEY idx_users_external_auth_provider (external_auth_provider);
