/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function discordImageUrl(source: string) {
    const url = new URL(source);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !["cdn.discordapp.com", "media.discordapp.net", "images-ext-1.discordapp.net", "images-ext-2.discordapp.net"].includes(url.hostname)) throw new Error("Only Discord-hosted image attachments and image proxies are supported.");
    return url;
}
export async function fetchDiscordImage(source: string, signal: AbortSignal) {
    const url = discordImageUrl(source);
    const controller = new AbortController(), abort = () => controller.abort(); signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) controller.abort();
    const timer = setTimeout(abort, 15000);
    try {
        const response = await fetch(url, { signal: controller.signal, credentials: "omit", redirect: "error", referrerPolicy: "no-referrer" });
        const type = response.headers.get("content-type")?.split(";")[0] ?? "";
        if (!response.ok || !/^image\/(png|jpeg|webp|gif)$/.test(type)) throw new Error("The attachment did not return a supported image.");
        const reader = response.body?.getReader(); if (!reader) throw new Error("The image could not be read.");
        const chunks: Uint8Array<ArrayBuffer>[] = []; let size = 0;
        try {
            for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 8 * 1024 * 1024) { await reader.cancel(); throw new Error("Choose an image under 8 MB."); } chunks.push(new Uint8Array(value)); }
        } finally { reader.releaseLock(); }
        return new File(chunks, "discord-image", { type });
    } finally { clearTimeout(timer); signal.removeEventListener("abort", abort); }
}
