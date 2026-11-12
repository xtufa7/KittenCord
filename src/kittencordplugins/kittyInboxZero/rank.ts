/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function inboxRank(input: { mentions: number; vip: boolean; keyword: boolean; serverIndex: number; }) {
    return (input.mentions > 0 ? 1_000_000 + Math.min(input.mentions, 999) * 100 : 0) + (input.vip ? 100_000 : 0) + (input.keyword ? 10_000 : 0) + (input.serverIndex < 0 ? 0 : Math.max(0, 1000 - input.serverIndex));
}
export function idList(text: string) { return [...new Set(text.split(/[\s,]+/).filter(value => /^\d{17,20}$/.test(value)))]; }
