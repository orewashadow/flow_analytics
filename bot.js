import { Telegraf } from 'telegraf';
import { config } from './config.js';
import { handleMessage, handleEditedMessage, handlePoll } from './handlers/messages.js';
import { handleNewMembers, handleLeftMember } from './handlers/joinLeave.js';
import { handleChatMemberUpdate } from './handlers/admin.js';

const bot = new Telegraf(config.botToken);

// ---- Routing ---------------------------------------------------------------
// Each handler is self-contained (see src/handlers/). Adding a new event
// type later means adding one handler file + one line here — nothing
// else needs to change.

bot.on('message', async (ctx, next) => {
  try {
    // new_chat_members / left_chat_member arrive as message subtypes,
    // so branch on those before falling through to the general handler.
    if (ctx.message.new_chat_members) {
      await handleNewMembers(ctx);
      return;
    }
    if (ctx.message.left_chat_member) {
      await handleLeftMember(ctx);
      return;
    }
    if (ctx.message.poll) {
      await handlePoll(ctx);
      return; // poll messages don't also count as regular messages
    }

    await handleMessage(ctx);
  } catch (err) {
    console.error('Error handling message:', err);
  }
  return next();
});

bot.on('edited_message', async (ctx) => {
  try {
    await handleEditedMessage(ctx);
  } catch (err) {
    console.error('Error handling edited_message:', err);
  }
});

bot.on('chat_member', async (ctx) => {
  try {
    await handleChatMemberUpdate(ctx);
  } catch (err) {
    console.error('Error handling chat_member update:', err);
  }
});

// ---- Basic commands ---------------------------------------------------------

bot.command('start', (ctx) =>
  ctx.reply(
    'Community Intelligence Bot is active in this chat. ' +
    'I\'m now logging activity so we can build analytics, leaderboards, and more over time.'
  )
);

bot.command('ping', (ctx) => ctx.reply('pong — bot is alive and logging.'));

// ---- Launch -----------------------------------------------------------------
// allowed_updates must explicitly list chat_member or Telegram won't send
// those events (they're opt-in, unlike regular messages).
bot.launch({
  allowedUpdates: ['message', 'edited_message', 'chat_member'],
});

console.log('Bot started.');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
