/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function parseLanguages(value: string, supported: readonly string[]) {
    const languages = [...new Set(value.split(",").map(item => item.trim()).filter(Boolean))];
    if (languages.length > 4 || languages.some(language => !supported.includes(language))) throw new Error("Choose up to four supported language codes, separated by commas.");
    return languages;
}
