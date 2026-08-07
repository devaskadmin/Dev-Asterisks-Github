# Community Sharing Architecture (v0.85.gb.5)

## Goal
Prepare Global Workout Plans for future Community Sharing without enabling trainer/user creation yet.

## Current State (v0.85.gb.5)
- Global plan types:
  - `featured`
  - `community_shared`
- Current write policy:
  - `featured`: administrators only
  - `community_shared`: administrators only (temporary)
- Workout Builder behavior:
  - Select tab loads only Featured plans
  - Community Shared plans are intentionally excluded

## Policy Layer
Centralized policy logic is implemented in `backend/api/users.js` using:
- `normalizeSessionRoleSlug(req)`
- `canCreateCommunitySharedPlan(req)`
- `validateRequestedWorkoutPlanType(req, rawValue, options)`

### Surface Keys
- `workout_builder`
- `admin_global`

### Current Community Shared Allowlist
`COMMUNITY_SHARED_ALLOWED_CREATOR_ROLES = ['admin']`

This allowlist is intentionally isolated so future expansion can be done by policy/config updates, not endpoint rewrites.

## Endpoint Design
### Existing admin global CRUD (enabled)
- `GET /api/admin/global-workout-plans`
- `GET /api/admin/global-workout-plans/:id`
- `POST /api/admin/global-workout-plans`
- `PATCH /api/admin/global-workout-plans/:id`
- `DELETE /api/admin/global-workout-plans/:id`

### Workout Builder feed
- `GET /api/featured-workout-plans`
- Returns only `featured` plans.
- Community Shared plans are not returned.

## Future Enablement Plan (Trainers + Users)
When Community Sharing is approved for broader creation:
1. Expand role policy allowlist:
   - Add `trainer`
   - Add `member` (or equivalent role slug)
2. Keep admin CRUD unchanged.
3. Add dedicated Community Shared creation/edit UX (separate from Featured controls).
4. Add moderation workflow before broad visibility (recommended):
   - `pending_review` status
   - `approved` and `rejected` states
5. Add discovery/read endpoints for Community Shared plans with filtering/pagination.

## Recommended Next Backend Increments
- Add explicit `plan_origin` or `sharing_status` columns for moderation lifecycle.
- Add `created_by_user_id`, `approved_by_user_id`, and moderation timestamps.
- Add audit trail for plan-type changes and publish/unpublish actions.
- Add role/capability table-driven policy (instead of hardcoded allowlist) once RBAC scope expands.

## Non-Goals in v0.85.gb.5
- No trainer/user Community Shared creation yet.
- No Community Shared display in Workout Builder select tab yet.
- No public sharing/discovery endpoint yet.
