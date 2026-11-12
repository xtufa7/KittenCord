/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function vipIds(value: string) { return new Set(value.split(/[\s,]+/).filter(id => /^\d{17,20}$/.test(id)).slice(0, 100)); }
export function vipMessage(author: string, channelPrivate: boolean, mentions: readonly string[], self: string, users: ReadonlySet<string>) { return author !== self && users.has(author) && (channelPrivate || mentions.includes(self)); }
