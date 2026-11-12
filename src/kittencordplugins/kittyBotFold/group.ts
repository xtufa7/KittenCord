/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const BOT_GROUP = "MESSAGE_GROUP_KITTY_BOT_";
export function botGroup(message: { author: { id: string; bot?: boolean; }; channel_id: string; webhookId?: string | null; blocked?: boolean; deleted?: boolean; }, disabledChannels: string, disabledBots: string) {
    const ids = (value: string) => value.split(/[\s,]+/);
    if (message.blocked || message.deleted || !message.author.bot && !message.webhookId || ids(disabledChannels).includes(message.channel_id) || ids(disabledBots).includes(message.author.id)) return;
    return BOT_GROUP + message.author.id;
}
