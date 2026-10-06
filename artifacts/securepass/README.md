# SecurePass

SecurePass is a privacy-first password-security education app. It teaches safer password habits and provides an educational password estimate without sending the password to a server.

## Problem Statement

People often reuse passwords or rely on short, predictable patterns, while password-security guidance can be difficult to evaluate safely.

## Objective

Offer clear security education and a private, browser-only password practice tool.

## Features

- Local password-strength estimate, suggestions, and checks for length, character variety, repeated characters, common weak patterns, and sequences.
- Password-safety lessons covering reuse, passphrases, password managers, multi-factor authentication, phishing, and common mistakes.
- Interactive 10-question security quiz with explanations and review.
- Eight-item security checklist with progress feedback.
- Session-only educational security score, plus optional anonymous aggregate password characteristics.
- Privacy, security architecture, and project overview pages.
- Optional anonymous saves for evaluation characteristics, quiz scores, and checklist answers.

## Technology Stack

- React, TypeScript, Vite, Tailwind CSS, and Wouter.
- Supabase REST/PostgREST using the project's public publishable key and restrictive row-level security.

This Replit artifact uses React + Vite rather than Next.js. Vite was selected for the app artifact format.

## Architecture

Password evaluation runs entirely in the browser. The password exists only in the checker component's transient state and the synchronous analysis call. Save functions accept only a limited set of non-sensitive categories and booleans; they have no password or hash field. Supabase is accessed directly from the client using the public key, with RLS restricting anonymous access to inserts and one aggregate-only statistics function.

## Privacy Design

SecurePass never stores the actual passwords entered into the password checker. Passwords and password hashes are never sent to an API, Supabase, analytics, logs, URLs, cookies, local storage, or session storage. Quiz and checklist progress stays in memory unless the user explicitly chooses to save an anonymous result.

Never enter a real password into a demonstration application. Use a test password instead. The score is an educational estimate, not a guarantee against cracking.

## Database Design

Run `supabase/schema.sql` in the Supabase SQL Editor. It creates:

- `password_evaluations`: strength and length categories, character-type booleans, sequence flag, and timestamp.
- `quiz_results`: score, total questions, and timestamp.
- `security_checklists`: checklist booleans and timestamp.

There are no password or password-hash fields. Anonymous users can insert records but cannot select individual rows. `get_securepass_aggregates()` exposes only counts and distributions.

## Folder Structure

- `src/lib/password-checker.ts` — local-only password analysis.
- `src/lib/securepass-data.ts` — optional anonymous Supabase writes and aggregate reads.
- `src/App.tsx` — application routes and interactive learning flows.
- `src/components/error-boundary.tsx` — generic, non-sensitive error fallback.
- `supabase/schema.sql` — tables, RLS policies, grants, and aggregate function.

## Environment Variables

Copy `.env.example` to `.env.local` for local setup:

- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — your Supabase publishable (formerly anon) key.

Both values are optional for local-only use. Without them, the checker, quiz, and checklist still work, while saving and live anonymous insights are disabled. Never put a service-role key in frontend configuration.

## Local Development

Run the app with the Replit preview workflow, or from the workspace using the configured artifact command:

```sh
pnpm --filter @workspace/securepass run dev
```

Check TypeScript with:

```sh
pnpm --filter @workspace/securepass run typecheck
```

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL Editor.
3. Add the project URL and publishable key to Replit environment variables or Vercel environment variables as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Never use a Supabase service-role key in this browser app.
5. Leave saving disabled until the schema and RLS setup have been applied.

Anonymous inserts can be abused or spammed by visitors. For a public production deployment, consider adding rate limiting or a server-side abuse-control layer before enabling anonymous writes.

## GitHub Setup

1. Create a GitHub repository.
2. Connect this Replit project to the repository using Replit's Git tools.
3. Commit the project files, including `.env.example`.
4. Do not commit `.env.local` or any credentials.

## Vercel Deployment

The frontend is a Vite single-page app. Configure the Vercel project to use this artifact directory, build with the workspace's pnpm install and the package build script, and publish `dist/public`. Set `BASE_PATH=/` and `PORT=5173` for builds using the current Vite config. Add the Supabase environment variables only if you have applied the schema and intend to enable anonymous saves. Configure SPA fallback so direct visits to routes such as `/checker` serve the app entry point.

## Security Considerations

- Password strength is an estimate and not a cracking simulation.
- The checker is for test passwords only; do not enter credentials used on real accounts.
- The public key is not a secret. RLS and SQL grants enforce data access limits.
- No password or password hash belongs in Supabase.
- Anonymous write endpoints may require rate limiting before a public launch.

## Future Enhancements

- Add server-side abuse controls for anonymous submissions.
- Add optional signed-in progress only if user accounts become necessary.
- Expand educational content and periodically review the guidance.
