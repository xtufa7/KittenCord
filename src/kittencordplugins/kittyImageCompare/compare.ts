/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function comparisonPosition(value: number) {
    if (!Number.isFinite(value)) return 50;
    return Math.min(100, Math.max(0, value));
}
export function comparisonFile(file: Pick<File, "type" | "size">) {
    if (!file.size || file.size > 16 * 1024 * 1024 || !/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Choose PNG, JPEG or WebP files under 16 MB.");
}
