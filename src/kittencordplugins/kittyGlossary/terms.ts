/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function parseGlossary(source: string): Record<string, string> {
    if (source.length > 100000) throw new Error("Glossary exceeds 100 KB.");
    const data: unknown = JSON.parse(source.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Use a JSON object of terms and definitions.");
    const entries = Object.entries(data);
    if (entries.length > 200 || entries.some(([term, definition]) => !term.trim() || term.length > 80 || typeof definition !== "string" || definition.length > 1000)) throw new Error("Use up to 200 terms, 80 characters per term and 1,000 per definition.");
    return Object.fromEntries(entries.map(([term, definition]) => [term.trim(), String(definition)]));
}
export function termSegments(text: string, glossary: Record<string, string>): { text: string; definition?: string; }[] {
    const entries = Object.keys(glossary).sort((a, b) => b.length - a.length);
    if (!entries.length || text.length > 20000) return [{ text }];
    const lookup = new Map(entries.map(term => [term.toLocaleLowerCase(), glossary[term]]));
    const regex = new RegExp(entries.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "giu");
    const segments: { text: string; definition?: string; }[] = [];
    let cursor = 0;
    for (const match of text.matchAll(regex)) {
        const { index } = match, end = index + match[0].length;
        if (/[\p{L}\p{N}_]/u.test(text[index - 1] ?? "") || /[\p{L}\p{N}_]/u.test(text[end] ?? "")) continue;
        if (index > cursor) segments.push({ text: text.slice(cursor, index) });
        segments.push({ text: match[0], definition: lookup.get(match[0].toLocaleLowerCase()) });
        cursor = end;
    }
    if (cursor < text.length) segments.push({ text: text.slice(cursor) });
    return segments;
}
