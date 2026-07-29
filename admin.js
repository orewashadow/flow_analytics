import { config } from '../config.js';
import { getOrCreateCommunity, getOrCreateMember, setMemberAdminStatus, logEvent } from '../db.js';

/**
 * Handles chat_member updates — Telegram's feed of status changes for a
 * member in a chat (promoted to admin, demoted, restricted, banned,
 * unbanned, etc). Requires 'chat_member' to be included in allowed_updates
 * when launching the bot (see bot.js).
 */
export async function handleChatMemberUpdate(ctx) {
  if (!config.features.trackAdminActions) return;

  const update = ctx.chatMember;
  if (!update) return;

  const chat = ctx.chat;
  const community = await getOrCreateCommunity(chat.id, chat.title ?? 'Unknown', chat.type);

  const targetUser = update.new_chat_member.user;
  if (targetUser.is_bot) return;

  const oldStatus = update.old_chat_member.status;
  const newStatus = update.new_chat_member.status;
  const performedBy = update.from; // the admin who made the change

  const targetMember = await getOrCreateMember(community.id, targetUser);

  // Keep is_admin in sync so leaderboards/analytics can filter admins easily.
  const isNowAdmin = ['administrator', 'creator'].includes(newStatus);
  await setMemberAdminStatus(community.id, targetUser.id, isNowAdmin);

  let actionType = null;
  if (newStatus === 'kicked') actionType = 'ban';
  else if (newStatus === 'restricted') actionType = 'mute';
  else if (oldStatus === 'restricted' && newStatus === 'member') actionType = 'unmute';
  else if (oldStatus === 'kicked' && newStatus === 'left') actionType = 'unban';
  else if (isNowAdmin && !['administrator', 'creator'].includes(oldStatus)) actionType = 'promote';
  else if (!isNowAdmin && ['administrator', 'creator'].includes(oldStatus)) actionType = 'demote';

  if (!actionType) return; // status change we don't track yet (e.g. join via chat_member)

  const actingMember = performedBy ? await getOrCreateMember(community.id, performedBy) : null;

  await logEvent({
    communityId: community.id,
    memberId: actingMember?.id ?? null,
    eventType: 'admin_action',
    metadata: {
      actionType,
      targetMemberId: targetMember.id,
      targetTelegramUserId: targetUser.id,
      oldStatus,
      newStatus,
    },
  });
}
