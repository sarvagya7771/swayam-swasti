#!/usr/bin/env node
/**
 * Supabase configuration checker — runs without deploying anything.
 *
 *   npm run check:env
 *
 * 1. Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from the process
 *    environment (AppJet Settings → Environment) or a local .env.local file.
 * 2. Validates their *shape*: a real https URL and a publishable/anon key.
 * 3. Refuses to accept a secret key — `service_role` / `sb_secret_` must never
 *    reach the browser bundle, and this script fails loudly if one appears.
 * 4. If the URL is valid, performs a single reachability check against the
 *    Supabase Auth health endpoint, then one read against `public.profiles`
 *    to confirm the database schema has actually been applied.
 * 5. Reports which of this app's own tables already exist, so you can tell a
 *    DEDICATED project (none exist yet — schema.sql is safe) from a SHARED one
 *    (another app already owns a table with the same name — use
 *    schema_safe.sql or a separate project).
 *
 * Exit codes: 0 = configuration usable, 1 = problems found.
 * The key is always masked in output; values are never printed in full.
 */

import { existsSync, readFileSync } from 'node:fs';

const URL_VAR = 'VITE_SUPABASE_URL';
const KEY_VAR = 'VITE_SUPABASE_ANON_KEY';

/* --------------------------------------------------------------- env load -- */

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const name = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) value = value.slice(1, -1);
    if (name) out[name] = value;
  }
  return out;
}

const fromFiles = { ...parseEnvFile('.env'), ...parseEnvFile('.env.local') };
const read = (name) => String(process.env[name] ?? fromFiles[name] ?? '').trim();
const source = (name) =>
  process.env[name] !== undefined ? 'environment' : fromFiles[name] !== undefined ? '.env file' : 'not set';

/* ----------------------------------------------------------------- helpers -- */

const mask = (value) => {
  if (!value) return '(empty)';
  if (value.length <= 14) return `${value.slice(0, 4)}…(${value.length} chars)`;
  return `${value.slice(0, 10)}…(${value.length} chars)`;
};

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

const errors = [];
const warnings = [];
const notes = [];

/* ------------------------------------------------------------------- URL --- */

const rawUrl = read(URL_VAR);
const url = rawUrl.replace(/\/+$/, '');

if (!rawUrl) {
  errors.push(`${URL_VAR} is missing. Add it in Settings → Environment Variables.`);
} else if (/^[A-Z][A-Z0-9_]{2,}$/.test(rawUrl)) {
  // The classic slip: the variable *name* pasted into the *value* field.
  errors.push(
    `${URL_VAR} contains the text "${rawUrl}", which is a variable name, not a URL. ` +
      `Its value must look like https://your-project-ref.supabase.co`,
  );
} else if (!/^https?:\/\//i.test(rawUrl)) {
  errors.push(`${URL_VAR} must start with https:// — received "${mask(rawUrl)}".`);
} else if (!/^https:\/\//i.test(rawUrl)) {
  errors.push(`${URL_VAR} must use https:// (http:// will be blocked in the browser).`);
} else if (/supabase\.co\/rest\/v1/i.test(rawUrl)) {
  errors.push(
    `${URL_VAR} points at the REST endpoint. Use the bare Project URL ` +
      `(https://your-project-ref.supabase.co), without /rest/v1.`,
  );
} else if (!/\.supabase\.co$/i.test(url) && !/\.supabase\.in$/i.test(url)) {
  warnings.push(
    `${URL_VAR} does not end in .supabase.co — fine only if you use a custom domain or self-hosted Supabase.`,
  );
}

if (rawUrl && rawUrl !== url) {
  warnings.push(`${URL_VAR} has a trailing slash; the app trims it automatically.`);
}

/* ------------------------------------------------------------------- key --- */

const key = read(KEY_VAR);

if (!key) {
  errors.push(`${KEY_VAR} is missing. Add it in Settings → Environment Variables.`);
} else if (/^[A-Z][A-Z0-9_]{2,}$/.test(key)) {
  errors.push(
    `${KEY_VAR} contains the text "${key}", which is a variable name, not a key. ` +
      `Paste the Publishable key value (starts with sb_publishable_ or eyJ).`,
  );
} else if (key.startsWith('sb_secret_') || /service_role/i.test(key)) {
  errors.push(
    `${KEY_VAR} looks like a SECRET key (service_role / sb_secret_...). ` +
      `Never put a secret key in a VITE_ variable — it would be published in the browser JavaScript. ` +
      `Remove it from Settings immediately and use the Publishable key instead.`,
  );
} else if (key.startsWith('sb_publishable_')) {
  notes.push(`${KEY_VAR}: publishable key format recognised.`);
} else {
  const payload = decodeJwtPayload(key);
  if (payload) {
    if (payload.role === 'service_role') {
      errors.push(
        `${KEY_VAR} is a service_role JWT. That is a secret — remove it from Settings and use the anon/publishable key.`,
      );
    } else if (payload.role === 'anon') {
      notes.push(`${KEY_VAR}: legacy anon JWT recognised (role=anon) — still supported.`);
    } else {
      warnings.push(`${KEY_VAR} is a JWT but its role is "${payload.role ?? 'unknown'}", not "anon".`);
    }
    if (payload.ref && url.includes('.supabase.co')) {
      const urlRef = url.replace(/^https?:\/\//, '').split('.')[0];
      if (urlRef !== payload.ref) {
        errors.push(
          `${KEY_VAR} belongs to project "${payload.ref}" but ${URL_VAR} points at "${urlRef}". ` +
            `Both values must come from the same Supabase project.`,
        );
      }
    }
  } else {
    warnings.push(
      `${KEY_VAR} is neither sb_publishable_… nor a JWT — double-check you copied the Publishable key, not the project ref or a password.`,
    );
  }
}

/* --------------------------------------------------------------- report ---- */

console.log('Supabase configuration check');
console.log('──────────────────────────────────────────────');
console.log(`${URL_VAR}  = ${rawUrl || '(empty)'}   [${source(URL_VAR)}]`);
console.log(`${KEY_VAR} = ${mask(key)}   [${source(KEY_VAR)}]`);
console.log('');

for (const note of notes) console.log(`  ok    ${note}`);
for (const warning of warnings) console.log(`  warn  ${warning}`);
for (const error of errors) console.log(`  FAIL  ${error}`);

/* ------------------------------------------------------- live connection --- */

const urlUsable = /^https?:\/\//i.test(rawUrl) && !errors.some((e) => e.startsWith(URL_VAR));
const keyUsable = Boolean(key) && !errors.some((e) => e.startsWith(KEY_VAR));

async function probe(path, label, expectTable) {
  const endpoint = `${url}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    const body = await response.text();
    let detail = '';
    try {
      const parsed = JSON.parse(body);
      detail = parsed?.message || parsed?.error_description || parsed?.msg || '';
    } catch {
      /* non-JSON body is fine */
    }

    if (expectTable && response.status === 404 && /PGRST205|does not exist|schema cache/i.test(body)) {
      console.log(`  FAIL  ${label}: reachable, but the table "public.${expectTable}" is missing.`);
      console.log('        → Run supabase/schema.sql in the Supabase SQL Editor (see README step 2).');
      return { ok: false };
    }
    if (response.status === 401 || response.status === 403) {
      console.log(`  FAIL  ${label}: HTTP ${response.status} — the key was rejected.${detail ? ` (${detail})` : ''}`);
      return { ok: false };
    }
    if (response.ok) {
      console.log(`  ok    ${label}: HTTP ${response.status}${expectTable ? ` — table "public.${expectTable}" exists` : ''}.`);
      return { ok: true };
    }
    console.log(`  warn  ${label}: HTTP ${response.status}${detail ? ` — ${detail}` : ''}.`);
    return { ok: response.status < 500 };
  } catch (cause) {
    const reason = cause?.name === 'AbortError' ? 'timed out after 10s' : (cause?.message ?? String(cause));
    console.log(`  FAIL  ${label}: could not reach ${url} — ${reason}`);
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

// Is one of this app's tables present? PGRST205 / "schema cache" means the
// table genuinely does not exist; a 200 with [] means it exists and RLS simply
// returned no rows for an anonymous request.
async function tableState(table) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    const body = await response.text();
    if (response.status === 404 && /PGRST205|schema cache|does not exist/i.test(body)) return 'missing';
    if (response.ok) return 'exists';
    if (response.status === 401 || response.status === 403) return 'denied';
    return 'unknown';
  } catch {
    return 'error';
  } finally {
    clearTimeout(timer);
  }
}

if (urlUsable && keyUsable) {
  console.log('\nLive connection');
  console.log('──────────────────────────────────────────────');
  const auth = await probe('/auth/v1/health', 'Auth endpoint reachable');

  // PostgREST's OpenAPI root refuses publishable keys ("Secret API key
  // required"), so the schema is verified with a direct read instead. An empty
  // array means the table exists and RLS returned no rows — which is correct
  // for an anonymous request.
  const schema = await probe(
    '/rest/v1/profiles?select=id&limit=1',
    'Database schema applied',
    'profiles',
  );

  // ---------------------------------------------------- project scope ------
  // schema.sql may only be run on a project dedicated to this customer app.
  // If another application already owns a table with one of these names, the
  // script would enable RLS on that table and silently skip creating it.
  const APP_TABLES = [
    'profiles',
    'bookings',
    'testimonials',
    'notifications',
    'services',
    'guidance_articles',
  ];

  console.log('\nProject scope');
  console.log('──────────────────────────────────────────────');

  const states = {};
  for (const table of APP_TABLES) states[table] = await tableState(table);

  const present = APP_TABLES.filter((t) => states[t] === 'exists');
  const absent = APP_TABLES.filter((t) => states[t] === 'missing');
  const unknown = APP_TABLES.filter((t) => !['exists', 'missing'].includes(states[t]));

  console.log(`  checked ${APP_TABLES.length} app tables: ${absent.length} absent, ${present.length} present${unknown.length ? `, ${unknown.length} inconclusive` : ''}`);
  if (present.length) console.log(`  present: ${present.join(', ')}`);
  if (unknown.length) console.log(`  inconclusive: ${unknown.map((t) => `${t} (${states[t]})`).join(', ')}`);

  if (!present.length && absent.length === APP_TABLES.length) {
    console.log('  ok    none of this app\'s tables exist yet.');
    console.log('        → This project holds no data these tables would collide with.');
    console.log('        → schema.sql is safe here IF the project is dedicated (see README).');
  } else if (present.length) {
    console.log('  warn  this project already contains tables with these names.');
    console.log('        → It may be shared with another application.');
    console.log('        → Use supabase/schema_safe.sql (aborts instead of overwriting) or a dedicated project.');
  } else {
    console.log('  warn  could not determine whether these tables exist.');
    console.log('        → Confirm in Supabase → Table Editor before running schema.sql.');
  }

  console.log('');
  if (auth.ok && schema.ok) {
    console.log('RESULT: configuration is valid and the database schema is in place.');
    console.log('Next: configure Google in Supabase → Authentication → Providers (README step 3).');
    process.exit(0);
  }
  if (auth.ok && !schema.ok) {
    console.log('RESULT: credentials are valid and the project is reachable, but the schema is not installed.');
    console.log('Next: run supabase/schema.sql in the Supabase SQL Editor (README section 2), then re-run this check.');
    process.exit(1);
  }
  console.log('RESULT: configuration is partly usable — see the FAIL lines above.');
  process.exit(1);
}

console.log('\nLive connection');
console.log('──────────────────────────────────────────────');
console.log('  skip  not attempted — fix the FAIL lines above first.');
console.log('');
console.log('RESULT: configuration is NOT valid yet.');
console.log('Fix the values in Settings → Environment Variables, then run: npm run check:env');
process.exit(1);
