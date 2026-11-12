/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function matchesPanicKey(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "shiftKey" | "altKey" | "metaKey" | "repeat" | "isComposing">, letter: string) {
    return !event.repeat && !event.isComposing && event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey && event.key.toUpperCase() === letter.toUpperCase();
}
