/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function parseDelimited(text: string, delimiter = ","): string[][] {
    if (text.length > 50000) throw new Error("Table exceeds 50,000 characters.");
    const rows: string[][] = []; let row: string[] = [], cell = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
            else if (quoted || !cell) quoted = !quoted;
            else cell += char;
        } else if (!quoted && char === delimiter) { row.push(cell); cell = ""; }
        else if (!quoted && (char === "\n" || char === "\r")) { row.push(cell); rows.push(row); row = []; cell = ""; if (char === "\r" && text[i + 1] === "\n") i++; }
        else cell += char;
        if (rows.length > 100 || row.length > 20) throw new Error("Use at most 100 rows and 20 columns.");
    }
    if (quoted) throw new Error("An opening quote has no closing quote.");
    if (cell || row.length) rows.push([...row, cell]);
    if (rows.length > 100 || rows.some(row => row.length > 20)) throw new Error("Use at most 100 rows and 20 columns.");
    if (rows.length < 2 || rows[0].length < 2 || rows.some(value => value.length !== rows[0].length)) throw new Error("Choose a rectangular table with a header and at least one data row.");
    return rows;
}
