/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function emojiCode(value: string) {
    const points = [...value.trim()].filter(char => char.codePointAt(0) !== 0xfe0f);
    if (points.length !== 1 || !/\p{Extended_Pictographic}/u.test(points[0])) throw new Error("Choose one simple emoji on each side.");
    return points[0].codePointAt(0)?.toString(16) ?? "";
}
export function kitchenUrl(left: string, right: string) {
    return `https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u${emojiCode(left)}/u${emojiCode(left)}_u${emojiCode(right)}.png`;
}
