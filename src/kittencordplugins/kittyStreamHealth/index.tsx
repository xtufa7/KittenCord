/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CompactNotice, KcButton, PrefGroup, PrefRow } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { closePluginPanels, openPluginPanel } from "@utils/kittyPluginPanel";
import definePlugin from "@utils/types";
import { ApplicationStreamingStore, MediaEngineStore, React, useEffect, UserStore, useState } from "@webpack/common";

import { streamMetrics, type StreamSample, streamSample } from "./stats";

function connections(): { getStats(): Promise<unknown>; }[] {
    const engine: unknown = MediaEngineStore.getMediaEngine();
    if (!engine || typeof engine !== "object" || !("connections" in engine) || !(engine.connections instanceof Set || Array.isArray(engine.connections))) return [];
    const result: { getStats(): Promise<unknown>; }[] = [];
    for (const item of engine.connections) if (item && typeof item === "object" && item.streamUserId === UserStore.getCurrentUser()?.id && typeof item.getStats === "function") result.push(item);
    return result;
}
function show() {
    openPluginPanel("KittyStreamHealth", "Stream health", function Monitor() {
        const [metrics, setMetrics] = useState<ReturnType<typeof streamMetrics>>(), [error, setError] = useState("Waiting for your outbound video statistics.");
        useEffect(() => {
            let alive = true, busy = false, previous: StreamSample | undefined;
            async function tick() {
                if (busy || !alive) return;
                if (!ApplicationStreamingStore.getCurrentUserActiveStream()) { previous = undefined; setMetrics(undefined); setError("You are not currently streaming."); return; }
                busy = true;
                try {
                    let current: StreamSample | undefined;
                    for (const connection of connections()) { const data = await connection.getStats(); current = streamSample(data, Date.now()); if (current) break; }
                    if (!alive) return;
                    if (current) { setMetrics(streamMetrics(current, previous)); previous = current; setError(""); }
                    else { previous = undefined; setMetrics(undefined); setError("This Discord connection does not expose standard outbound video counters. No values are estimated."); }
                } catch { if (alive) setError("Stream statistics are unavailable on this connection."); }
                finally { busy = false; }
            }
            void tick(); const timer = setInterval(() => { void tick(); }, 3000);
            return () => { alive = false; clearInterval(timer); };
        }, []);
        return <>{error && <CompactNotice>{error}</CompactNotice>}{metrics && <PrefGroup><PrefRow label="Frames per second" detail={metrics.fps?.toFixed(1) ?? "Not reported"}/><PrefRow label="Outbound bitrate" detail={metrics.bitrate === undefined ? "Not reported" : `${(metrics.bitrate / 1000).toFixed(0)} kbps`}/><PrefRow label="Resolution" detail={metrics.width && metrics.height ? `${metrics.width} × ${metrics.height}` : "Not reported"}/><PrefRow label="Discarded frames" detail={metrics.dropped ?? "Not reported"}/>{metrics.fps !== undefined && metrics.fps < 15 && <CompactNotice tone="warning">Video frame rate is below 15 fps.</CompactNotice>}</PrefGroup>}</>;
    });
}
export default definePlugin({
    name: "KittyStreamHealth", description: "Inspect your stream's real outbound WebRTC counters when Discord exposes them. Unsupported counters are labeled instead of fabricated.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Voice", "Utility"],
    settingsAboutComponent: () => <KcButton onClick={show}>Inspect current stream</KcButton>, toolboxActions: { "Stream health": show },
    flux: { LOGOUT() { closePluginPanels("KittyStreamHealth"); } }, stop() { closePluginPanels("KittyStreamHealth"); }
});
