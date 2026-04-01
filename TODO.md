# User Endpoints - Ensure All Exist & Swagger Documented

## Current Status

- [x] Analyzed files: routes, controller, swagger config
- [x] Confirmed 14/15 endpoints exist with partial docs

## Steps to Complete:

- [x] Step 1: Add missing PUT /api/users/:id (general admin update)
  - Added route in src/routes/user.routes.ts with JSDoc
  - Added handler in src/controllers/user.controller.ts with full @swagger docs
- [x] Step 2: Enhance JSDoc Swagger docs in src/routes/user.routes.ts for specified endpoints:
      | Endpoint | Status |
      |----------|--------|
      | PUT /api/users/:id | Added |
      | DELETE /api/users/:id | Existing + consistent |
      | GET /api/users/:id/activity | Existing + consistent |
      | POST /api/users/bulk-delete | Existing + consistent |
      | PUT /api/users/:id/status | Existing + consistent |
      | GET /api/users/export | Existing + consistent |
      | GET /api/users/stats | Existing + consistent |
- [x] Step 3: Update TODO.md - Mark steps complete
- [x] Step 4: Restart server: `npm run dev` (Windows cmd, run in new terminal if needed)
- [x] Step 5: Verified all 15 endpoints exist with Swagger docs under User/User-Admin tags
- [x] Step 6: Task complete - All endpoints implemented and documented

**Notes:** change-email POST (not PUT) but documented. All endpoints functional with auth/cache/audit.
