/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const discord = ["discord.com", "discordapp.com", "discordapp.net", "discord.gg", "discord.media", "discord-attachments.com"];
export function externalHost(input: string, base: string): string | undefined {
    try { const url = new URL(input, base); if (!["https:", "http:", "wss:", "ws:"].includes(url.protocol)) return; const host = url.hostname.toLowerCase(); return discord.some(domain => host === domain || host.endsWith(`.${domain}`)) ? undefined : host; } catch { return; }
}
export function denyPlugin(plugin: string, denied: string, allowed: string) { const list = (text: string) => text.split(/[,\n]/).map(item => item.trim()).filter(Boolean); return plugin !== "unknown" && !list(allowed).includes(plugin) && list(denied).includes(plugin); }
