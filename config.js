import 'dotenv/config';

// Central place for all config. Nothing should be hardcoded elsewhere —
// if a new module needs a setting, add it here first.
export const config = {
  botToken: process.env.BOT_TOKEN,
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },

  // Feature flags — lets us turn modules on/off per deployment without
  // touching code. Later, per-community overrides can live in the
  // communities.settings jsonb column instead of here.
  features: {
    trackReactions: true,
    trackEdits: true,
    trackDeletes: true,
    trackMedia: true,
    trackPolls: true,
    trackAdminActions: true,
  },
};

// Fail fast and loudly if required secrets are missing — better than a
// confusing crash three files deep.
function assertConfigured() {
  const missing = [];
  if (!config.botToken) missing.push('BOT_TOKEN');
  if (!config.supabase.url) missing.push('SUPABASE_URL');
  if (!config.supabase.anonKey) missing.push('SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      `Check your .env file against .env.example.`
    );
  }
}

assertConfigured();
