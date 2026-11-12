/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function shelfLinks(text: string): { url: string; domain: string; }[] {
    const links = new Map<string, string>();
    for (const match of text.matchAll(/https?:\/\/[^\s<>]+/gi)) {
        try { const url = new URL(match[0].replace(/[).,;!?]+$/, "")); if (!url.username && !url.password) links.set(url.href, url.hostname); }
        catch { continue; }
        if (links.size >= 30) break;
    }
    return [...links].map(([url, domain]) => ({ url, domain }));
}
