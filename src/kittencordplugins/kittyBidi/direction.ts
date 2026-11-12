/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function firstStrongDirection(text: string): "rtl" | "ltr" | "auto" {
    for (const char of text.replace(/https?:\/\/\S+|<[@#][^>]+>/g, "")) {
        if (/[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(char)) return "rtl";
        if (/\p{L}/u.test(char)) return "ltr";
    }
    return "auto";
}
