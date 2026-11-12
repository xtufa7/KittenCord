/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { parseDelimited } from "@utils/kittyDelimited";
export { parseDelimited } from "@utils/kittyDelimited";

export function markdownTable(text: string) {
    const rows = parseDelimited(text, text.includes("\t") ? "\t" : ",");
    const escaped = rows.map(row => `| ${row.map(cell => cell.replace(/\|/g, "\\|").replace(/[\r\n]/g, " ").trim()).join(" | ")} |`);
    escaped.splice(1, 0, `| ${rows[0].map(() => "---").join(" | ")} |`);
    return escaped.join("\n");
}
export function codeBlock(text: string, language = "") {
    const fence = "`".repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map(match => match[0].length + 1)));
    return `${fence}${language}\n${text}\n${fence}`;
}
export function prettyJson(text: string) {
    if (text.length > 50000) throw new Error("JSON exceeds 50,000 characters.");
    return codeBlock(JSON.stringify(JSON.parse(text), null, 2), "json");
}
export function replaceUnique(draft: string, source: string, replacement: string) {
    const start = draft.indexOf(source);
    if (!source || start < 0 || draft.indexOf(source, start + source.length) >= 0) throw new Error("The pasted text changed or occurs more than once. Paste into an empty draft to convert it safely.");
    return draft.slice(0, start) + replacement + draft.slice(start + source.length);
}
