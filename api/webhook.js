import { bot } from '../src/bot.js';

/**
 * Telegram calls this URL directly (via setWebhook) every time there's
 * a new update — no polling, no persistent process, fits Vercel's
 * serverless model perfectly.
 *
 * We always respond 200 even on internal errors, because Telegram will
 * aggressively retry a webhook that returns a non-200 status, which
 * could cause duplicate event logging. Errors are logged to Vercel's
 * function logs instead.
 */
export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).send('Community Intelligence Bot webhook is live.');
    return;
  }

  try {
    await bot.handleUpdate(req.body);
  } catch (err) {
    console.error('Webhook error:', err);
  }

  res.status(200).json({ ok: true });
}

