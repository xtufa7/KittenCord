/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function accentHex(value: string) { return /^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(value) ? value.slice(0, 7).toLowerCase() : undefined; }
