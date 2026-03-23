# Contributing to REZ Backend

## Quick Start (5 minutes)

1. Clone the repo
2. Copy `.env.example` → `.env` and fill in required values
3. Install dependencies: `npm install`
4. Start dev server: `npm run dev`
5. Run tests: `npm test`

## Required Environment Variables

See `.env.example` for all required variables. Critical ones:
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — must be at least 32 characters in production
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — use test keys locally
- `REDIS_URL` — Redis connection string

## Before Submitting a PR

- [ ] `npm run build` passes (TypeScript check)
- [ ] `npm test` passes (all tests green)
- [ ] New features have tests
- [ ] No `console.log` in production code (use `logger` from `config/logger`)

## Code Style

- Use `asyncHandler()` for all async route handlers
- Use `sendSuccess()` / `sendError()` for responses
- Use `logger.info/warn/error()` — never `console.log`
- Add pagination to all list endpoints (page/limit params)
- Use Redis caching for frequently-accessed data (60s user-specific, 300s shared)
- Use `escapeRegex()` for any user input in regex queries

## Architecture

- Models: `src/models/` (Mongoose + TypeScript)
- Routes: `src/routes/` (Express Router)
- Services: `src/services/` (business logic)
- Middleware: `src/middleware/` (auth, validation, rate limiting)
- Config: `src/config/` (database, logger, middleware setup)
