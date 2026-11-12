/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const words: Record<string, string[]> = {
    salam: ["سلام"], mar7aba: ["مرحبا"], ahlan: ["أهلا"], shukran: ["شكرا"], shokran: ["شكرا"],
    ana: ["أنا"], enta: ["أنت"], enti: ["أنتِ"], e7na: ["إحنا"], keef: ["كيف"], kif: ["كيف"],
    "7abibi": ["حبيبي"], "7abibti": ["حبيبتي"], "3arabi": ["عربي"], "3araby": ["عربي"],
    yalla: ["يلا"], wallah: ["والله"], inshallah: ["إن شاء الله"], mabrook: ["مبروك"],
    kteer: ["كتير"], ktiir: ["كتير"], tamam: ["تمام"], la2: ["لا"], na3am: ["نعم"],
    "3ala": ["على"], ya3ni: ["يعني"], "7elo": ["حلو"], "5alas": ["خلاص"], khalas: ["خلاص"],
    mesh: ["مش"], mish: ["مش"], shu: ["شو"], shou: ["شو"], badi: ["بدي"], baddi: ["بدي"],
    "2albi": ["قلبي", "ألبي"], "3am": ["عم", "عام"], "3alem": ["عالم", "عَلِم"],
    "7al": ["حال", "حل"], "3en": ["عين", "عن"], "2amar": ["قمر", "أمر"],
    "2": ["ء"], "3": ["ع"], "5": ["خ"], "6": ["ط"], "7": ["ح"], "8": ["غ"], "9": ["ص"]
};
const pairs: Record<string, string> = { "3'": "غ", "7'": "خ", "6'": "ظ", "9'": "ض", sh: "ش", kh: "خ", gh: "غ", th: "ث", dh: "ذ", ch: "تش", aa: "ا", ee: "ي", oo: "و" };
const letters: Record<string, string> = { a: "ا", b: "ب", t: "ت", j: "ج", g: "ج", h: "ه", d: "د", r: "ر", z: "ز", s: "س", f: "ف", q: "ق", k: "ك", l: "ل", m: "م", n: "ن", w: "و", u: "و", o: "و", i: "ي", e: "ي", y: "ي", ...Object.fromEntries(Object.entries(words).filter(([key]) => /^\d$/.test(key)).map(([key, values]) => [key, values[0]])) };

export function arabiziOptions(word: string): string[] {
    const lower = word.toLowerCase();
    if (words[lower]) return words[lower];
    return [lower.replace(/3'|7'|6'|9'|sh|kh|gh|th|dh|ch|aa|ee|oo|[a-z2356789]/g, char => pairs[char] ?? letters[char] ?? char)];
}
export function toArabic(text: string) {
    return text.replace(/https?:\/\/\S+|```[\s\S]*?```|`[^`]*`|[a-z2356789][a-z2356789']*/gi, word => /^https?:|^`/.test(word) ? word : arabiziOptions(word)[0]);
}
export function completedWord(text: string) {
    const match = /([a-z2356789][a-z2356789']*)([\s.,!?]+)$/i.exec(text);
    if (!match) return;
    const prefix = text.slice(0, match.index);
    if ((prefix.match(/`/g)?.length ?? 0) % 2 || /https?:\/\/\S*$/i.test(prefix)) return;
    return { prefix, word: match[1], suffix: match[2], options: arabiziOptions(match[1]) };
}
const reverse: Record<string, string> = { ا: "a", أ: "2a", إ: "2e", آ: "aa", ء: "2", ؤ: "2", ئ: "2", ب: "b", ت: "t", ث: "th", ج: "j", ح: "7", خ: "5", د: "d", ذ: "dh", ر: "r", ز: "z", س: "s", ش: "sh", ص: "9", ض: "9'", ط: "6", ظ: "6'", ع: "3", غ: "3'", ف: "f", ق: "q", ك: "k", ل: "l", م: "m", ن: "n", ه: "h", و: "w", ي: "y", ى: "a", ة: "a" };
export function toArabizi(text: string) { return text.replace(/\p{Script_Extensions=Arabic}/gu, char => reverse[char] ?? ""); }
