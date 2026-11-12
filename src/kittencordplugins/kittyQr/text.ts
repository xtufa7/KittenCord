/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function qrText(value: string) {
    if (!value.trim() || new TextEncoder().encode(value).length > 2048) throw new Error("Enter text or a link up to 2,048 UTF-8 bytes.");
    return value;
}
