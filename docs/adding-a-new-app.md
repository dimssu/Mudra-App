# Onboarding a New App to Mudra

Mudra is a multi-tenant auth service. Every request is scoped to an **app** via
the `X-App-ID` request header. Adding a new app means registering an `AppConfig`
record and providing that app's Firebase service-account credentials — no code
changes are required.

Each app is fully isolated:

- Its own Firebase Admin instance (used to verify Google ID tokens).
- Its own list of `allowedOrigins` (per-app CORS enforcement).
- Tokens are issued and revoked per `appId`.

---

## What an app needs

| Field | Description | Example |
|-------|-------------|---------|
| `appId` | Lowercase, unique, sent as the `X-App-ID` header | `saved-spark` |
| `appName` | Human-readable name | `Saved Spark` |
| `allowedOrigins` | Browser origins permitted to call Mudra for this app | `https://saved-spark-frontend.vercel.app`, `http://localhost:3000` |
| `firebaseCredsEnvKey` | **Name** of the env var holding the base64 service-account JSON (never the value itself) | `SAVED_SPARK_FIREBASE_CREDS` |

> The credentials live in environment variables, not in the database. `AppConfig`
> only stores the env var **name**. Set the value on the server and restart.

---

## Step 1 — Provide Firebase credentials

Base64-encode the Firebase service-account JSON and expose it under the env key
you chose:

```bash
# macOS / Linux
base64 -i saved-spark-firebase-adminsdk.json | tr -d '\n'
```

Add it to `.env` (kept out of git):

```env
SAVED_SPARK_FIREBASE_CREDS=<base64-encoded-service-account-json>
```

Also add the env key to your deployment platform's secrets.

## Step 2 — Register the app

You can register an app **either** by editing the seed list **or** at runtime via
the admin API.

### Option A — Seed list (committed default)

Add an entry to `SEED_CONFIGS` in
[`src/scripts/seed-app-configs.ts`](../src/scripts/seed-app-configs.ts):

```ts
{
  appId: 'saved-spark',
  appName: 'Saved Spark',
  allowedOrigins: [
    'https://saved-spark-frontend.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5180',
  ],
  firebaseCredsEnvKey: 'SAVED_SPARK_FIREBASE_CREDS',
  isActive: true,
},
```

Then seed (idempotent — existing apps are skipped):

```bash
npx ts-node src/scripts/seed-app-configs.ts
```

On startup the server also auto-seeds from this list **if the DB has no active
apps yet**, so a fresh deploy comes up pre-configured.

### Option B — Admin API (runtime, no restart of the seed)

Requires `SUPER_ADMIN_API_KEY`. The env var named by `firebaseCredsEnvKey` must
already be set on the server, or the call is rejected.

```bash
curl -X POST http://localhost:3003/mudra/admin/apps \
  -H "Authorization: Bearer $SUPER_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "saved-spark",
    "appName": "Saved Spark",
    "allowedOrigins": [
      "https://saved-spark-frontend.vercel.app",
      "http://localhost:3000"
    ],
    "firebaseCredsEnvKey": "SAVED_SPARK_FIREBASE_CREDS"
  }'
```

The new app's Firebase instance is initialized eagerly, so it works immediately.

Other admin endpoints:

```bash
# List all apps
curl http://localhost:3003/mudra/admin/apps -H "Authorization: Bearer $SUPER_ADMIN_API_KEY"

# Update origins / toggle isActive (busts the config cache automatically)
curl -X PATCH http://localhost:3003/mudra/admin/apps/saved-spark \
  -H "Authorization: Bearer $SUPER_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"allowedOrigins": ["https://saved-spark-frontend.vercel.app"]}'

# Deactivate (apps listed in PROTECTED_APP_IDS are blocked from deactivation)
curl -X DELETE http://localhost:3003/mudra/admin/apps/saved-spark \
  -H "Authorization: Bearer $SUPER_ADMIN_API_KEY"
```

---

## Step 3 — Call Mudra from the client

Send `X-App-ID` on every request. Example (Saved Spark frontend,
`src/services/mudra.ts`):

```ts
const mudraClient = axios.create({
  baseURL: import.meta.env.VITE_MUDRA_BASE_URL, // e.g. http://localhost:3003
  headers: { 'Content-Type': 'application/json', 'X-App-ID': 'saved-spark' },
});

// Google sign-in
mudraClient.post('/mudra/auth/google/get-access', { idToken });
```

If `X-App-ID` is omitted, Mudra falls back to `DEFAULT_APP_ID` (backward compat).
An unknown or inactive `appId` returns `400`; a disallowed `Origin` returns `403`.

---

## Configuration reference

| Env var | Purpose |
|---------|---------|
| `DEFAULT_APP_ID` | App used when no `X-App-ID` header is sent |
| `SUPER_ADMIN_API_KEY` | Bearer key for `/mudra/admin/*` endpoints |
| `PROTECTED_APP_IDS` | Comma-separated app IDs that cannot be deactivated via the admin API (default: `techanewz,lakawat`) |
| `<APP>_FIREBASE_CREDS` | Base64 service-account JSON per app, referenced by `firebaseCredsEnvKey` |
