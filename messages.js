import { config } from '../config.js';
import {
  getOrCreateCommunity,
  getOrCreateMember,
  logEvent,
  incrementDailyStat,
} from '../db.js';

/**
 * Figures out what kind of content a message contains. Returns one of
 * the content_type values expected by the events table.
 */
function detectContentType(message) {
  if (message.photo) return 'photo';
  if (message.video) return 'video';
  if (message.animation) return 'gif';
  if (message.sticker) return 'sticker';
  if (message.voice) return 'voice';
  if (message.document) return 'document';
  if (message.poll) return 'poll';
  if (message.text && /https?:\/\//.test(message.text)) return 'link';
  if (message.text) return 'text';
  return 'other';
}

/**
 * Shared setup every handler needs: resolve the community + member rows
 * for this chat/user, creating them on first contact.
 */
async function resolveContext(ctx) {
  const chat = ctx.chat;
  const from = ctx.from;

  const community = await getOrCreateCommunity(chat.id, chat.title ?? chat.username ?? 'Unknown', chat.type);
  const member = from ? await getOrCreateMember(community.id, from) : null;

  return { community, member };
}

/**
 * Handles every new incoming message: logs the raw event, updates the
 * daily rollup, and detects commands/replies/forwards/mentions along the way.
 */
export async function handleMessage(ctx) {
  const { community, member } = await resolveContext(ctx);
  const message = ctx.message;
  const contentType = detectContentType(message);

  const isCommand = message.text?.startsWith('/');
  const isReply = Boolean(message.reply_to_message);
  const isForward = Boolean(message.forward_date || message.forward_origin);

  await logEvent({
    communityId: community.id,
    memberId: member?.id,
    eventType: isCommand ? 'command' : 'message',
    messageId: message.message_id,
    replyToMessageId: message.reply_to_message?.message_id ?? null,
    contentType,
    metadata: {
      isForward,
      textLength: message.text?.length ?? message.caption?.length ?? 0,
      entities: message.entities?.map((e) => e.type) ?? [],
    },
  });

  if (!member) return;

  await incrementDailyStat(community.id, member.id, 'messages_count');

  if (config.features.trackMedia && contentType !== 'text' && contentType !== 'other') {
    await incrementDailyStat(community.id, member.id, 'media_count');
  }

  if (isReply) {
    await incrementDailyStat(community.id, member.id, 'replies_sent');

    // Credit the original author with a "reply received" if we can
    // identify them — helps measure who prompts the most engagement.
    const originalAuthor = message.reply_to_message.from;
    if (originalAuthor && !originalAuthor.is_bot) {
      const originalMember = await getOrCreateMember(community.id, originalAuthor);
      await incrementDailyStat(community.id, originalMember.id, 'replies_received');
    }
  }
}

/**
 * Handles edited messages. Telegram sends these as a separate update type.
 */
export async function handleEditedMessage(ctx) {
  if (!config.features.trackEdits) return;

  const { community, member } = await resolveContext(ctx);
  const message = ctx.update.edited_message;

  await logEvent({
    communityId: community.id,
    memberId: member?.id,
    eventType: 'edit',
    messageId: message.message_id,
    contentType: detectContentType(message),
    metadata: { editedAt: new Date(message.edit_date * 1000).toISOString() },
  });

  if (member) {
    await incrementDailyStat(community.id, member.id, 'edits_count');
  }
}

/**
 * Handles poll creation events (polls being answered is a separate update
 * type — poll_answer — which can be added here later following the same
 * pattern).
 */
export async function handlePoll(ctx) {
  if (!config.features.trackPolls) return;

  const chat = ctx.chat;
  const community = await getOrCreateCommunity(chat.id, chat.title ?? 'Unknown', chat.type);
  const poll = ctx.update.message?.poll ?? ctx.update.poll;

  await logEvent({
    communityId: community.id,
    eventType: 'poll',
    metadata: {
      question: poll.question,
      optionCount: poll.options?.length ?? 0,
      isAnonymous: poll.is_anonymous,
    },
  });
}
