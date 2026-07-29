import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

export const supabase = createClient(config.supabase.url, config.supabase.anonKey);

/**
 * Every DB access for the bot funnels through this file.
 * This keeps handlers thin and means the database can be swapped or
 * restructured later without touching handler logic.
 */

// ---- Communities ---------------------------------------------------------

/**
 * Finds a community by its Telegram chat id, creating it if it doesn't
 * exist yet (i.e. first time the bot sees an event from this group).
 */
export async function getOrCreateCommunity(chatId, title, type) {
  const { data: existing, error: findError } = await supabase
    .from('communities')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from('communities')
    .insert({ telegram_chat_id: chatId, title, type })
    .select()
    .single();

  if (insertError) throw insertError;
  return created;
}

// ---- Members --------------------------------------------------------------

/**
 * Finds a member scoped to a community, creating them if this is their
 * first seen event. Also refreshes last_seen and profile fields (name/
 * username can change over time) on every call.
 */
export async function getOrCreateMember(communityId, telegramUser) {
  const { data: existing, error: findError } = await supabase
    .from('members')
    .select('*')
    .eq('community_id', communityId)
    .eq('telegram_user_id', telegramUser.id)
    .maybeSingle();

  if (findError) throw findError;

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('members')
      .update({
        username: telegramUser.username ?? existing.username,
        first_name: telegramUser.first_name ?? existing.first_name,
        last_name: telegramUser.last_name ?? existing.last_name,
        last_seen: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) throw updateError;
    return updated;
  }

  const { data: created, error: insertError } = await supabase
    .from('members')
    .insert({
      community_id: communityId,
      telegram_user_id: telegramUser.id,
      username: telegramUser.username,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return created;
}

export async function setMemberAdminStatus(communityId, telegramUserId, isAdmin) {
  const { error } = await supabase
    .from('members')
    .update({ is_admin: isAdmin })
    .eq('community_id', communityId)
    .eq('telegram_user_id', telegramUserId);

  if (error) throw error;
}

// ---- Events -----------------------------------------------------------------

/**
 * Logs a single raw event. This is the write path for everything the
 * platform tracks — messages, edits, deletes, joins, reactions, etc.
 * Keep this generic; event-specific detail belongs in `metadata`.
 */
export async function logEvent({
  communityId,
  memberId = null,
  eventType,
  messageId = null,
  replyToMessageId = null,
  contentType = null,
  metadata = {},
}) {
  const { error } = await supabase.from('events').insert({
    community_id: communityId,
    member_id: memberId,
    event_type: eventType,
    message_id: messageId,
    reply_to_message_id: replyToMessageId,
    content_type: contentType,
    metadata,
  });

  if (error) throw error;
}

// ---- Daily stats rollup ------------------------------------------------------

/**
 * Increments today's rollup row for a member using an atomic upsert +
 * increment. This keeps dashboard queries fast without scanning raw events.
 * `field` must be one of the numeric columns on daily_stats.
 */
export async function incrementDailyStat(communityId, memberId, field) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { data: existing, error: findError } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('community_id', communityId)
    .eq('member_id', memberId)
    .eq('stat_date', today)
    .maybeSingle();

  if (findError) throw findError;

  if (existing) {
    const { error: updateError } = await supabase
      .from('daily_stats')
      .update({ [field]: (existing[field] ?? 0) + 1 })
      .eq('id', existing.id);
    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabase
    .from('daily_stats')
    .insert({
      community_id: communityId,
      member_id: memberId,
      stat_date: today,
      [field]: 1,
    });
  if (insertError) throw insertError;
}
