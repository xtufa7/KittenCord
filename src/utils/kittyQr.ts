/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import jsQR from "jsqr";

export async function decodeQr(blob: Blob) {
    if (blob.size > 8 * 1024 * 1024 || !/^image\/(?:png|jpeg|webp|gif)$/.test(blob.type)) throw new Error("Choose a PNG, JPEG, WebP or GIF under 8 MB.");
    const bitmap = await createImageBitmap(blob, { resizeWidth: 1600, resizeQuality: "high" });
    try {
        if (bitmap.width * bitmap.height > 4_000_000) throw new Error("Image dimensions are too large.");
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height), context = canvas.getContext("2d");
        if (!context) throw new Error("Image processing is unavailable.");
        context.drawImage(bitmap, 0, 0);
        const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height);
        return jsQR(pixels.data, pixels.width, pixels.height)?.data ?? "";
    } finally { bitmap.close(); }
}
