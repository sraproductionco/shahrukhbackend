# shahrukhbackend (Phase 1)

Express.js API for the video editor portfolio. Ready for **Vercel** deployment.

## Stack

- Express + TypeScript
- PostgreSQL via **Supabase**
- Video/object storage via **Backblaze B2** (S3-compatible API)

## Local setup

```bash
cp .env.example .env
# Fill in Supabase + Backblaze values
npm install
npm run dev
```

Health check: `http://localhost:3000/api/health`

## Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy Project URL + service role key into `.env`
3. Run `sql/schema.sql` in the Supabase SQL Editor

## Backblaze B2

1. Create a B2 bucket (private or public as needed)
2. Create an application key with read/write on that bucket
3. Enable S3-compatible API and set `B2_ENDPOINT` / `B2_REGION` from the B2 console
4. Set `B2_PUBLIC_URL` to your friendly URL or Cloudflare CDN URL later

## Deploy on Vercel

1. Import `shahrukhbackend` as a Vercel project
2. Add all env vars from `.env.example`
3. Deploy — `vercel.json` routes all traffic to `api/index.ts`

```bash
npx vercel
```

## Phase 2 (next)

- Admin auth
- Categories CRUD
- Project/video upload (presigned B2 URLs)
- Public portfolio APIs
