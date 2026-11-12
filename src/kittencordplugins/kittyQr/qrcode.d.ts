/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

declare module "qrcode" {
    export function toDataURL(text: string, options?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H"; width?: number; margin?: number; }): Promise<string>;
    export function create(text: string, options?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H"; }): { modules: { size: number; data: Uint8Array; }; };
}
