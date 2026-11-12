/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function digestText(counts: ReadonlyMap<string, number>) { const messages = [...counts.values()].reduce((sum, count) => sum + count, 0); return `${messages} message${messages === 1 ? "" : "s"} in ${counts.size} channel${counts.size === 1 ? "" : "s"}`; }
