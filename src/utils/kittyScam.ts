/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const trusted = ["discord.com", "discord.gift", "discord.gg", "steamcommunity.com", "steampowered.com"];
const confusables: Record<string, string> = { "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y", "і": "i", "ј": "j", "ѕ": "s", "ԁ": "d", "ԛ": "q", "ο": "o", "ρ": "p", "ν": "v", "ι": "i", "ε": "e", "ӏ": "l" };

export function normalizeName(text: string) {
    return text.normalize("NFKC").toLowerCase().replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, "").replace(/./gu, char => confusables[char] ?? char);
}

export function decodeHostname(host: string): string {
    return host.split(".").map(label => {
        if (!label.startsWith("xn--")) return label;
        const input = label.slice(4), output: number[] = [];
        let cursor = input.lastIndexOf("-");
        if (cursor >= 0) for (const char of input.slice(0, cursor)) output.push(char.codePointAt(0) ?? 0);
        cursor++;
        let n = 128, i = 0, bias = 72;
        while (cursor < input.length) {
            const old = i;
            let weight = 1;
            for (let k = 36; ; k += 36) {
                const char = input.charCodeAt(cursor++);
                const digit = char >= 48 && char <= 57 ? char - 22 : char >= 97 && char <= 122 ? char - 97 : 36;
                if (digit >= 36 || !Number.isSafeInteger(i + digit * weight)) return label;
                i += digit * weight;
                const threshold = k <= bias ? 1 : k >= bias + 26 ? 26 : k - bias;
                if (digit < threshold) break;
                weight *= 36 - threshold;
                if (!Number.isSafeInteger(weight)) return label;
            }
            let delta = Math.floor((i - old) / (old === 0 ? 700 : 2));
            delta += Math.floor(delta / (output.length + 1));
            let k = 0;
            while (delta > 455) { delta = Math.floor(delta / 35); k += 36; }
            bias = k + Math.floor(36 * delta / (delta + 38));
            n += Math.floor(i / (output.length + 1));
            i %= output.length + 1;
            if (n > 0x10ffff || n >= 0xd800 && n <= 0xdfff) return label;
            output.splice(i++, 0, n);
        }
        return String.fromCodePoint(...output);
    }).join(".");
}

export function scamWarnings(text: string): string[] {
    const warnings = new Set<string>();
    const normalized = normalizeName(text);
    if (/\b(?:accidentally|by mistake)\b.{0,60}\breport(?:ed)?\b|\breport(?:ed)?\b.{0,60}\b(?:accidentally|by mistake)\b/i.test(normalized)) warnings.add("Possible accidental-report scam");
    if (/\b(?:free|claim|win)\b.{0,40}\bnitro\b|\bdiscord (?:staff|support)\b.{0,80}\b(?:verify|payment|password|login)\b/i.test(normalized)) warnings.add("Possible social engineering");
    for (const match of text.matchAll(/https?:\/\/[^\s<>\])]+/gi)) {
        let url: URL;
        try { url = new URL(match[0]); } catch { continue; }
        const host = url.hostname.toLowerCase().replace(/\.$/, "");
        if (trusted.some(domain => host === domain || host.endsWith(`.${domain}`))) {
            if (host === "discord.com" && /^\/(?:ra|login|remote-auth)(?:\/|$)/i.test(url.pathname)) warnings.add("Discord login link: never approve a login for someone else");
            continue;
        }
        const skeleton = normalizeName(decodeHostname(host)).replace(/[-_]/g, "");
        if (trusted.some(domain => skeleton.includes(domain) || skeleton.replace(/0/g, "o").replace(/1/g, "i").includes(domain))) warnings.add(`Possible lookalike domain: ${host}`);
    }
    return [...warnings];
}

export function qrWarning(text: string) {
    if (/^(?:https?:\/\/)?(?:[^/]+\.)?discord(?:app)?\.com\/(?:ra|login|remote-auth)(?:[/?#]|$)/i.test(text)) return "Discord login QR code. Approving it can sign someone else into your account.";
    return scamWarnings(text).join(" · ");
}
