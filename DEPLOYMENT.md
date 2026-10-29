# Deploy Classroom Allotter to Vercel

The database schema is already applied to the current Neon project. Deployment only needs the source repository and the same pooled `DATABASE_URL` as a protected environment variable.

**Current production URL:** [https://classroom-allotter.vercel.app](https://classroom-allotter.vercel.app)

## Recommended: deploy from GitHub

1. Push the completed project to the `main` branch of the GitHub repository.
2. Sign in at [vercel.com](https://vercel.com) with GitHub.
3. Select **Add New → Project** and import `vivekbhadoriya72177/classroom-allotter`.
4. Keep the project root as `./`. Vercel detects Express from `src/server.js`; do not add a build command or output directory.
5. Open **Environment Variables** and add:
   - Name: `DATABASE_URL`
   - Value: the pooled Neon connection string from the local `.env`
   - Environments: Production and Preview
6. Select **Deploy**.

The committed `vercel.json` runs the Express Function in Singapore, close to the Neon database. Files in `public/` are served through Vercel's CDN.

## Alternative: deploy with Vercel CLI

Run these commands from the project directory:

```bash
npx vercel@latest login
npx vercel@latest link
npx vercel@latest env add DATABASE_URL production
npx vercel@latest env add DATABASE_URL preview
npx vercel@latest --prod
```

When the environment-variable commands prompt for a value, paste the pooled Neon URL privately. Never include it directly in a terminal command, screenshot, commit, or chat message.

## Verify the live deployment

Replace `YOUR_DEPLOYMENT.vercel.app` below with the returned domain:

```bash
curl https://YOUR_DEPLOYMENT.vercel.app/api/health
```

Expected response:

```json
{
  "ok": true,
  "service": "classroom-allotter",
  "database": { "connected": true }
}
```

Then verify these browser flows:

1. Open the root URL and confirm the dashboard totals load.
2. Search for a room with a future same-day interval.
3. Submit a fresh empty-room observation and confirm it appears on that room card.
4. Record a future activity in an available room.
5. Submit the same interval again and confirm the conflict message appears.
6. Release the activity from the history list.

## How future deployments work

Once the GitHub repository is connected, every push to `main` creates a production deployment. Other branches create preview deployments. If `DATABASE_URL` is later changed in Vercel, redeploy because environment-variable changes only apply to new deployments.

## Common problems

| Symptom | Check |
|---|---|
| `/api/health` returns `503` | Confirm `DATABASE_URL` exists in the correct Vercel environment and uses the Neon pooled host. |
| Frontend loads but API fails | Inspect the Vercel Function logs and confirm the Neon database is active. |
| Database tables are missing | Apply `db/schema.sql` to a fresh database, or the migration and seed commands to the existing learning database. |
| A deployment still uses an old variable | Redeploy after saving the environment variable. |
| Static files return `404` | Confirm `index.html`, `styles.css`, and `app.js` remain under `public/`. |

## Important security note

The public MVP deliberately demonstrates scheduling logic without institutional authentication. Before allowing real campus use, add verified sign-in, CR/admin roles, rate limiting, abuse reporting, and object storage for moderated image uploads.
