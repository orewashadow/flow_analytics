/**
 * Visit this URL once in your browser after deploying to Vercel:
 *   https://your-project.vercel.app/api/set-webhook
 *
 * It tells Telegram where to send updates from now on. You only need to
 * run this once per deployment domain — re-run it if your Vercel URL
 * ever changes (e.g. custom domain added later).
 */
export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;

  if (!token) {
    res.status(500).json({ ok: false, error: 'BOT_TOKEN is not set in Vercel environment variables.' });
    return;
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const webhookUrl = `https://${host}/api/webhook`;

  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ['message', 'edited_message', 'chat_member'],
    }),
  });

  const telegramResponse = await response.json();

  res.status(200).json({ webhookUrl, telegramResponse });
}
