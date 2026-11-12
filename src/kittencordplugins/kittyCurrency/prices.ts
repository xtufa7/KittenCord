/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const aliases: Record<string, string> = { "$": "USD", "€": "EUR", "£": "GBP", "¥": "JPY", ريال: "SAR", درهم: "AED" };
export function findPrices(text: string) {
    const normalized = text.replace(/[٠-٩]/g, char => String(char.charCodeAt(0) - 0x660)).replace(/٫/g, ".").replace(/٬/g, ",");
    const result: { source: string; amount: number; currency: string; }[] = [];
    for (const match of normalized.matchAll(/([$€£¥])\s*(\d[\d,]*(?:\.\d{1,2})?)|\b(\d[\d,]*(?:\.\d{1,2})?)\s*(USD|EUR|GBP|JPY|CAD|AUD|CHF|CNY|SAR|AED|ريال|درهم)(?!\p{L})/giu)) {
        const amount = Number((match[2] ?? match[3]).replace(/,/g, "")), unit = match[1] ?? match[4];
        if (Number.isFinite(amount) && amount <= 1e12) result.push({ source: match[0], amount, currency: aliases[unit] ?? unit.toUpperCase() });
        if (result.length === 8) break;
    }
    return result;
}
export function parseRate(value: unknown, base: string, quote: string): { rate: number; date: string; } {
    if (!Array.isArray(value)) throw new Error("The rate provider returned an invalid response.");
    const row = value.find(row => row && typeof row === "object" && row.base === base && row.quote === quote);
    if (!row || typeof row.rate !== "number" || !Number.isFinite(row.rate) || row.rate <= 0 || typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new Error("No published rate is available for these currencies.");
    return { rate: row.rate, date: row.date };
}
