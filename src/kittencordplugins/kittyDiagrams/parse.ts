/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { parseDelimited } from "@utils/kittyDelimited";

export function diagramBlocks(text: string) {
    return [...text.matchAll(/```(mermaid|chart)\s*\n([\s\S]*?)```/g)].slice(0, 3).map(match => ({ language: match[1], source: match[2] }));
}
export function validateMermaid(text: string) {
    if (!text.trim() || text.length > 6000 || text.split("\n").length > 150) throw new Error("Use a diagram under 6,000 characters and 150 lines.");
    if (/%%\{|^---|https?:|data:|javascript:|<\/?[a-z!][^>]*>|\b(?:click|image|icon)\b/im.test(text)) throw new Error("Remote resources, HTML, configuration directives and interactive links are not supported.");
    return text;
}
export function chartPoints(source: string): { type: "bar" | "line"; points: { label: string; value: number; }[]; } {
    if (source.length > 10000) throw new Error("Chart exceeds 10,000 characters.");
    let type: "bar" | "line" = "bar", points: { label: string; value: number; }[];
    if (source.trim().startsWith("{")) {
        const data = JSON.parse(source);
        if (!data || (data.type !== "bar" && data.type !== "line") || !Array.isArray(data.points)) throw new Error("Use {type: bar or line, points: [{label, value}]}.");
        type = data.type; points = data.points;
    } else points = parseDelimited(source).slice(1).map(row => ({ label: row[0], value: Number(row[1]) }));
    if (!points.length || points.length > 40 || points.some(point => !point || typeof point.label !== "string" || point.label.length > 80 || typeof point.value !== "number" || !Number.isFinite(point.value) || Math.abs(point.value) > 1e12)) throw new Error("Use 1 to 40 labeled, finite numeric values.");
    return { type, points };
}
export function chartY(value: number, values: number[]) {
    const min = Math.min(0, ...values), max = Math.max(0, ...values);
    return max === min ? 180 : 180 - (value - min) / (max - min) * 160;
}
