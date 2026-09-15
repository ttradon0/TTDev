# TTDev · Common Room

A university meeting-room booking demo for Students and Administrators. The interface uses Next.js App Router, Supabase Auth/Postgres, shadcn/ui, React Hook Form, Zod, and a small React Bits motion component. The visual direction is warm campus editorial: paper, ink, deep green, and restrained motion.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set the Supabase project URL and publishable key. The seed script also needs a server-only Supabase secret key and private passwords for the two demo accounts.
4. Run `npm run seed:demo` to provision accounts, rooms, and historical demo bookings.
5. Start the app with `npm run dev`.

Demo account emails are `student@ttdev.demo` and `admin@ttdev.demo`. Passwords are intentionally supplied only through private environment variables; there are no sign-up or password-reset pages.

The Supabase schema and booking RPCs are in `supabase/migrations`. The connected Supabase project already has those migrations applied. The SQL schema uses explicit table grants and row-level security; booking creation and cancellation run through authenticated RPCs. For another project, link the Supabase CLI to that project and apply the migrations before running the seed script.

The local Supabase template disables email and general sign-ups. For hosted projects, also turn off email sign-ups in Authentication settings before sharing the demo. Newly created Auth users without a seeded profile cannot access app pages or booking RPCs.

## Booking behavior

- Bangkok time, day view only, with 30-minute slots from 06:00 through 18:00.
- A booking may last 30, 60, 90, or 120 minutes and must fit before closing.
- Booking starts must be in the next rolling 24 hours. Room capacity, maintenance status, student active-booking limits, cancellation cutoffs, and overlap prevention are checked in Postgres as well as the UI.
- PostgreSQL serializes competing bookings per Student and has an exclusion constraint for overlapping room intervals.
- Students can cancel at least 30 minutes before the start. Admins can cancel at any time.
- Removing a room hides it from Students and preserves its booking history.

## Verification

- `npm run lint` — ESLint.
- `npm run typecheck` — TypeScript.
- `npm run test:booking` — authenticated Supabase RPC concurrency check. Requires the seeded Student account, a server secret, and private environment values; it creates a temporary second Student and races both accounts for one slot, then removes the test data.
- `npm run test:browser` — Playwright Student booking/cancellation and Admin room-management flows. Requires both seeded accounts and Playwright Chromium.

Resend is not configured because email notifications are out of scope. The repository is prepared for Vercel, and this setup does not deploy it.
