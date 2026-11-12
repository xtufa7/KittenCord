/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { get, set } from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { KcButton } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { React, Tooltip, useState } from "@webpack/common";

import { findPrices, parseRate } from "./prices";
import style from "./style.css?managed";

const settings = definePluginSettings({
    online: { type: OptionType.BOOLEAN, default: false, description: "Enable currency conversion using api.frankfurter.dev. Only currency codes are requested, never message text. Rates are cached for 24 hours.", onChange(value) { if (!value) clear(); } },
    currency: { type: OptionType.STRING, default: "USD", description: "Your three-letter target currency code.", isValid: value => typeof value === "string" && /^[A-Z]{3}$/.test(value) || "Enter an uppercase ISO currency code." }
});
const requests = new Map<string, Promise<{ rate: number; date: string; }>>();
const controllers = new Set<AbortController>();
let active = false, epoch = 0;
async function rate(base: string, quote: string) {
    if (base === quote) return { rate: 1, date: new Date().toISOString().slice(0, 10) };
    const key = `${base}:${quote}`;
    const existing = requests.get(key);
    if (existing) return existing;
    const current = epoch;
    const pending = (async () => {
        const cached = await get<{ rate: number; date: string; at: number; }>(`KittenCord:Currency:${key}`);
        if (!active || current !== epoch || !settings.store.online) throw new Error("Online conversion is disabled.");
        if (cached && Number.isFinite(cached.rate) && cached.rate > 0 && /^\d{4}-\d{2}-\d{2}$/.test(cached.date) && Date.now() - cached.at < 86400000 && cached.at <= Date.now()) return cached;
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
        controllers.add(controller);
        try {
            const response = await fetch(`https://api.frankfurter.dev/v2/rates?base=${base}&quotes=${quote}`, { credentials: "omit", redirect: "error", signal: controller.signal });
            if (!response.ok) throw new Error("The rate provider is unavailable for this currency.");
            const reader = response.body?.getReader();
            if (!reader) throw new Error("The rate provider returned an empty response.");
            const decoder = new TextDecoder(); let text = "", size = 0;
            try {
                for (;;) {
                    const { value, done } = await reader.read(); if (done) break;
                    size += value.byteLength;
                    if (size > 10000) { await reader.cancel(); throw new Error("The rate response is too large."); }
                    text += decoder.decode(value, { stream: true });
                }
                text += decoder.decode();
            } finally { reader.releaseLock(); }
            const result = parseRate(JSON.parse(text), base, quote);
            if (active && current === epoch && settings.store.online) await set(`KittenCord:Currency:${key}`, { ...result, at: Date.now() });
            return result;
        } finally { clearTimeout(timer); controllers.delete(controller); }
    })();
    requests.set(key, pending);
    try { return await pending; } finally { if (requests.get(key) === pending) requests.delete(key); }
}
const Prices = ErrorBoundary.wrap(function Prices({ message }: { message: Message; }) {
    const { online, currency } = settings.use(["online", "currency"]);
    const [results, setResults] = useState<Record<string, string>>({});
    if (!online) return null;
    return <div className="kc-premium-settings vc-kitty-currency">{findPrices(message.content ?? "").map((price, index) => {
        const key = `${price.currency}:${price.amount}:${currency}`;
        return <Tooltip key={index} text={results[key] ?? `Convert ${price.currency} to ${currency}. Daily reference rates are estimates, not a transaction quote.`}>{props => <KcButton {...props} onClick={async () => {
            const current = epoch;
            try { const value = await rate(price.currency, currency); if (active && current === epoch && settings.store.online) setResults(old => ({ ...old, [key]: `${new Intl.NumberFormat(undefined, { style: "currency", currency }).format(price.amount * value.rate)} · Frankfurter ${value.date}` })); }
            catch (error) { if (active && current === epoch) setResults(old => ({ ...old, [key]: error instanceof Error ? error.message : "Conversion is unavailable." })); }
        }}>{price.source}</KcButton>}</Tooltip>;
    })}</div>;
}, { noop: true });
function clear() { epoch++; for (const controller of controllers) controller.abort(); controllers.clear(); requests.clear(); }
export default definePlugin({
    name: "KittyCurrency", description: "Optional price conversions with daily reference rates from api.frankfurter.dev. Local price detection, explicit requests, and a 24-hour rate cache.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Chat", "Utility"], dependencies: ["MessageAccessoriesAPI"], settings, managedStyle: style,
    renderMessageAccessory: props => <Prices message={props.message}/>,
    flux: { LOGOUT: clear }, start() { active = true; }, stop() { active = false; clear(); }
});
