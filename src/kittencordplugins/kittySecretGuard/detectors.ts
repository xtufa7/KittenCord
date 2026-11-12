/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface SecretFinding {
    kind: string;
    masked: string;
    count: number;
}

const patterns: readonly [string, RegExp][] = [
    ["AWS access key", /\b(?:AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}\b/g],
    ["AWS secret key", /\baws_secret_access_key\s*[:=]\s*["']?[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/gi],
    ["GitHub key", /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{22,255})\b/g],
    ["Stripe secret key", /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,255}\b/g],
    ["Google API key", /\bAIza[A-Za-z0-9_-]{35}\b/g],
    ["OpenAI-style key", /\bsk-(?!(?:live|test)_)(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,255}\b/g],
    ["Discord token-like text", /\b(?:[A-Za-z0-9_-]{20,32}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,110}|mfa\.[A-Za-z0-9_-]{80,110})(?![A-Za-z0-9_-])/g],
    ["Private key", /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/g],
    ["JWT", /\beyJ[A-Za-z0-9_-]{3,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(?![A-Za-z0-9_-])/g],
    ["Password assignment", /\b(?:password|passwd|pwd|pass)[ \t]*[:=][ \t]*(?:"[^"\r\n]+"|'[^'\r\n]+'|[^\s,;"']+)/gi]
];

export function isCardNumber(value: string): boolean {
    const digits = value.replace(/[ -]/g, "");
    if (!/^\d{13,19}$/.test(digits) || /^(\d)\1+$/.test(digits)) return false;
    let sum = 0;
    for (let i = digits.length - 1, double = false; i >= 0; i--, double = !double) {
        let digit = Number(digits[i]);
        if (double) digit = digit * 2 > 9 ? digit * 2 - 9 : digit * 2;
        sum += digit;
    }
    return sum % 10 === 0;
}

export function isIban(value: string): boolean {
    const iban = value.replace(/ /g, "");
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
    let remainder = 0;
    for (const char of iban.slice(4) + iban.slice(0, 4)) {
        const digits = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
        for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
    }
    return remainder === 1;
}

export function channelIsAllowlisted(channelId: string, setting: string): boolean {
    return setting.split(/[\s,]+/).some(id => /^\d{17,20}$/.test(id) && id === channelId);
}

export function detectSecrets(content: string): SecretFinding[] {
    const counts = new Map<string, number>();
    const add = (kind: string) => counts.set(kind, (counts.get(kind) ?? 0) + 1);
    for (const [kind, pattern] of patterns) {
        for (const _match of content.matchAll(new RegExp(pattern.source, pattern.flags))) add(kind);
    }
    for (const match of content.matchAll(/(?<![\w-])\d(?:[ -]?\d){12,18}(?![\w-]|[ -]\d)/g)) {
        if (isCardNumber(match[0])) add("Possible payment card");
    }
    for (const match of content.matchAll(/\b[A-Z]{2}\d{2}(?:[A-Z0-9]{11,30}|(?: [A-Z0-9]{4}){2,7}(?: [A-Z0-9]{1,4})?)\b/g)) {
        if (isIban(match[0])) add("IBAN");
    }
    return [...counts].map(([kind, count]) => ({ kind, count, masked: "••••••••" }));
}
