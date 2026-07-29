import { getOrCreateCommunity, getOrCreateMember, logEvent } from '../db.js';

/**
 * Handles one or more members joining a chat at once (Telegram batches
 * these into a single update when several people join together).
 */
export async function handleNewMembers(ctx) {
  const chat = ctx.chat;
  const community = await getOrCreateCommunity(chat.id, chat.title ?? 'Unknown', chat.type);

  for (const newMember of ctx.message.new_chat_members) {
    if (newMember.is_bot) continue; // don't track bots as community members

    const member = await getOrCreateMember(community.id, newMember);

    await logEvent({
      communityId: community.id,
      memberId: member.id,
      eventType: 'join',
      metadata: { via: 'new_chat_members' },
    });
  }
}

/**
 * Handles a member leaving or being removed from the chat.
 */
export async function handleLeftMember(ctx) {
  const chat = ctx.chat;
  const leftUser = ctx.message.left_chat_member;
  if (leftUser.is_bot) return;

  const community = await getOrCreateCommunity(chat.id, chat.title ?? 'Unknown', chat.type);
  const member = await getOrCreateMember(community.id, leftUser);

  await logEvent({
    communityId: community.id,
    memberId: member.id,
    eventType: 'leave',
    metadata: {},
  });
}
