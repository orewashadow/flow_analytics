import { Telegraf } from 'telegraf';
import { config } from './config.js';
import { handleMessage, handleEditedMessage, handlePoll } from './handlers/messages.js';
import { handleNewMembers, handleLeftMember } from './handlers/joinLeave.js';
import { handleChatMemberUpdate } from './handlers/admin.js';

export const bot = new Telegraf(config.botToken);

bot.on('message', async (ctx) => {
  try {
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
      return;
    }

    await handleMessage(ctx);
  } catch (err) {
    console.error('Error handling message:', err);
  }
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

bot.command('start', (ctx) =>
  ctx.reply(
    'Community Intelligence Bot is active in this chat. ' +
    "I'm now logging activity so we can build analytics, leaderboards, and more over time."
  )
);

bot.command('ping', (ctx) => ctx.reply('pong — bot is alive and logging.'));
