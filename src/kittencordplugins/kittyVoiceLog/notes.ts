/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface CallNote { at: number; text: string; }
export function parseNotes(value: unknown): CallNote[] {
    if (!Array.isArray(value)) return [];
    return value.filter((note): note is CallNote => note && typeof note.at === "number" && Number.isFinite(note.at) && typeof note.text === "string" && note.text.length <= 2000).slice(0, 200);
}
export function offset(at: number, start: number) { const seconds = Math.max(0, Math.floor((at - start) / 1000)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
export function notesMarkdown(start: number, notes: CallNote[]) { return notes.map(note => `- [${offset(note.at, start)}] ${note.text.replace(/\r?\n/g, " ").replace(/[<>]/g, "")}`).join("\n"); }
