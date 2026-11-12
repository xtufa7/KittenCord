/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface DraftVersion { id: string; channel: string; text: string; at: number; }
export function parseHistory(value: unknown): DraftVersion[] {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is DraftVersion => !!entry && typeof entry === "object" && typeof entry.id === "string" && typeof entry.channel === "string" && /^\d{17,20}$/.test(entry.channel) && typeof entry.text === "string" && entry.text.length <= 20000 && typeof entry.at === "number" && Number.isFinite(entry.at)).slice(0, 2000);
}
export function rememberDraft(history: DraftVersion[], channel: string, text: string, now: number, id: string): DraftVersion[] {
    if (!text.trim() || text.length > 20000 || !/^\d{17,20}$/.test(channel)) return history;
    const last = history.find(entry => entry.channel === channel);
    if (last?.text === text) return history;
    const rest = history.filter(entry => entry.channel !== channel || now - entry.at >= 1500);
    const counts = new Map<string, number>();
    return [{ id, channel, text, at: now }, ...rest].filter(entry => {
        const count = (counts.get(entry.channel) ?? 0) + 1;
        counts.set(entry.channel, count);
        return count <= 20;
    }).slice(0, 2000);
}
