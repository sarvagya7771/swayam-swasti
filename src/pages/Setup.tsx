import { Icon } from '../components/ui';

/**
 * Shown instead of the app when the Supabase environment variables are absent.
 *
 * There is deliberately no local-storage fallback: the app refuses to run with
 * fake data rather than pretending to be a working production service.
 */
export default function Setup() {
  return (
    <div className="auth-wrap">
      <div className="auth-card setup-card">
        <div className="auth-head">
          <p className="eyebrow">
            <Icon name="lock" size={14} /> Configuration required
          </p>
          <h1 className="h1">Connect your Supabase project</h1>
          <p className="small muted">
            This build has no database credentials yet, so sign-in and data storage are switched off.
            Nothing is stored in the browser — the app needs a real Supabase project to run.
          </p>
        </div>

        <ol className="setup-steps">
          <li>
            <strong>Create a free project</strong> at supabase.com and open it.
          </li>
          <li>
            <strong>Run the schema.</strong> In the SQL editor, run <code>supabase/schema.sql</code>,
            then optionally <code>supabase/seed.sql</code> for the service and guidance copy.
          </li>
          <li>
            <strong>Copy two values</strong> from Project Settings → API: the Project URL and the{' '}
            <code>anon</code> public key.
          </li>
          <li>
            <strong>Add them to this app's environment</strong> as <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code>, then rebuild.
          </li>
          <li>
            <strong>Enable sign-in methods</strong> under Authentication → Providers: Email and Google
            (Google needs an OAuth client ID and secret).
          </li>
        </ol>

        <div className="notice notice-brand">
          <Icon name="sparkle" size={16} />
          <span>
            Never place the <code>service_role</code> key in this app. Only the public{' '}
            <code>anon</code> key belongs here; row-level security in the schema protects the data.
          </span>
        </div>

        <p className="tiny muted center">
          Full step-by-step instructions, including the Google OAuth redirect URLs, are in the
          project README.
        </p>
      </div>
    </div>
  );
}
