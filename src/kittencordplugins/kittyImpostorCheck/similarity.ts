/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { normalizeName } from "@utils/kittyScam";

export function similarName(left: string, right: string) {
    const a = normalizeName(left).replace(/[^\p{L}\p{N}]/gu, ""), b = normalizeName(right).replace(/[^\p{L}\p{N}]/gu, "");
    if (Math.min(a.length, b.length) < 4 || Math.max(a.length, b.length) > 80 || Math.abs(a.length - b.length) > 1) return false;
    let row = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 0; i < a.length; i++) {
        const next = [i + 1];
        for (let j = 0; j < b.length; j++) next[j + 1] = Math.min(next[j] + 1, row[j + 1] + 1, row[j] + Number(a[i] !== b[j]));
        row = next;
    }
    return row[b.length] <= (Math.min(a.length, b.length) >= 6 ? 1 : 0);
}

export function differenceHash(pixels: Uint8ClampedArray, width: number, height: number) {
    if (width !== 9 || height !== 8 || pixels.length !== width * height * 4) throw new Error("A 9 by 8 RGBA sample is required.");
    const gray = (offset: number) => pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114;
    let hash = 0n;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) hash = hash << 1n | BigInt(gray((y * 9 + x) * 4) > gray((y * 9 + x + 1) * 4));
    return hash;
}

export function hashDistance(left: bigint, right: bigint) {
    let bits = left ^ right, count = 0;
    while (bits) { count++; bits &= bits - 1n; }
    return count;
}
