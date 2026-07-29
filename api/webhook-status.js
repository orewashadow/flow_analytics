export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;

  if (!token) {
    res.status(500).json({ ok: false, error: 'BOT_TOKEN is not set in Vercel environment variables.' });
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const data = await response.json();

  res.status(200).json(data);
}
