/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface StreamSample { at: number; bytes?: number; frames?: number; fps?: number; width?: number; height?: number; dropped?: number; }
function finite(value: unknown) { return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined; }
export function streamSample(value: unknown, at: number): StreamSample | undefined {
    const rows: unknown[] = value instanceof Map ? [...value.values()] : Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];
    for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const data = row as Record<string, unknown>;
        if (data.type === "outbound-rtp" && (data.kind === "video" || data.mediaType === "video") && !data.isRemote) return { at, bytes: finite(data.bytesSent), frames: finite(data.framesEncoded), fps: finite(data.framesPerSecond), width: finite(data.frameWidth), height: finite(data.frameHeight), dropped: finite(data.framesDiscardedOnSend) };
    }
    return undefined;
}
export function streamMetrics(current: StreamSample, previous?: StreamSample) {
    const seconds = previous ? (current.at - previous.at) / 1000 : 0;
    const delta = (key: "bytes" | "frames") => previous && seconds > 0 && current[key] !== undefined && previous[key] !== undefined && current[key] >= previous[key] ? (current[key] - previous[key]) / seconds : undefined;
    const bytes = delta("bytes");
    return { fps: current.fps ?? delta("frames"), bitrate: bytes === undefined ? undefined : bytes * 8, width: current.width, height: current.height, dropped: current.dropped };
}
