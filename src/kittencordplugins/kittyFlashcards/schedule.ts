/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface Flashcard { id: string; deck: string; front: string; back: string; ease: number; interval: number; repetitions: number; due: number; }
export function reviewCard(card: Flashcard, grade: number, now: number): Flashcard {
    if (![0, 3, 4, 5].includes(grade) || !Number.isFinite(now)) throw new Error("Choose a valid review result.");
    const ease = Math.max(1.3, Math.min(3.5, card.ease + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
    const repetitions = grade < 3 ? 0 : card.repetitions + 1;
    const interval = grade < 3 ? 1 : repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.min(3650, Math.round(card.interval * card.ease));
    return { ...card, ease, repetitions, interval, due: now + interval * 86400000 };
}
export function parseDeck(text: string): Flashcard[] {
    if (text.length > 5000000) throw new Error("Keep imports under 5 MB.");
    const input: unknown = JSON.parse(text);
    if (!Array.isArray(input) || input.length > 1000) throw new Error("Import a JSON array of up to 1,000 cards.");
    const seen = new Set<string>();
    return input.map(card => {
        if (!card || typeof card !== "object") throw new Error("Every card must be an object.");
        const value = card as Record<string, unknown>;
        for (const key of ["id", "deck", "front", "back"] as const) if (typeof value[key] !== "string" || !value[key].trim() || value[key].length > (key === "front" || key === "back" ? 6000 : 100)) throw new Error("Cards require an ID, deck, question and answer within the size limits.");
        const { id, deck, front, back } = value as { id: string; deck: string; front: string; back: string; };
        if (seen.has(id)) throw new Error("Card IDs must be unique."); seen.add(id);
        const number = (key: string, fallback: number, min: number, max: number) => typeof value[key] === "number" && Number.isFinite(value[key]) && value[key] >= min && value[key] <= max ? value[key] : fallback;
        return { id, deck, front, back, ease: number("ease", 2.5, 1.3, 3.5), interval: number("interval", 0, 0, 3650), repetitions: Math.floor(number("repetitions", 0, 0, 10000)), due: number("due", 0, 0, 8640000000000000) };
    });
}
