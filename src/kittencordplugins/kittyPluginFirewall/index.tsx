/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { guessPluginFromStack } from "@api/NetworkMonitor";
import { RuntimeInterposition } from "@api/RuntimeInterposition";
import { definePluginSettings } from "@api/Settings";
import { CompactNotice, KcButton, PrefGroup, PrefRow } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { closePluginPanels, openPluginPanel } from "@utils/kittyPluginPanel";
import definePlugin, { OptionType } from "@utils/types";
import { React, showToast } from "@webpack/common";

import { denyPlugin, externalHost } from "./policy";

const settings = definePluginSettings({ denied: { type: OptionType.STRING, default: "", multiline: true, description: "Plugin folder names to block on known external request and authentication access paths, separated by commas. Unknown attribution is never blocked." }, allowed: { type: OptionType.STRING, default: "", multiline: true, description: "Explicitly allowed plugin folder names. Allow takes precedence over deny." } });
interface Event { id: number; at: number; plugin: string; target: string; kind: string; blocked: boolean; }
let active = false, generation = 0, revision = 0;
const events: Event[] = [], listeners = new Set<() => void>(), dispose: (() => void)[] = [];
const publish = () => { revision++; for (const listener of listeners) listener(); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
function check(kind: string, target: string) {
    const stack = (new Error().stack ?? "").split("\n").filter(line => !/[\\/]kittyPluginFirewall[\\/]/.test(line)).join("\n");
    const plugin = guessPluginFromStack(stack), blocked = denyPlugin(plugin, settings.store.denied, settings.store.allowed);
    events.push({ id: ++revision, at: Date.now(), plugin, target, kind, blocked }); if (events.length > 200) events.shift(); publish();
    if (blocked) throw new DOMException(`Kitty Plugin Firewall blocked ${kind} for ${plugin}.`, "SecurityError");
}
function show() { openPluginPanel("KittyPluginFirewall", "Plugin activity", function Activity() {
    React.useSyncExternalStore(subscribe, () => revision);
    return <><CompactNotice tone="warning">Monitors and blocks known paths, not a sandbox. Same-renderer code can bypass hooks. Attribution is best effort; unknown calls are never blocked. Request bodies, headers, token values and complete URLs are never inspected or retained.</CompactNotice><KcButton onClick={() => { events.length = 0; publish(); }}>Clear session activity</KcButton><PrefGroup>{events.slice().reverse().map(event => <PrefRow key={event.id} label={`${event.plugin} · ${event.kind}`} description={`${event.target} · ${new Date(event.at).toLocaleTimeString()}`} detail={event.blocked ? "Blocked" : "Observed"}/>)}</PrefGroup>{!events.length && <CompactNotice>No matching activity observed this session.</CompactNotice>}</>;
}); }
export default definePlugin({
    name: "KittyPluginFirewall", description: "Monitor and block known external fetch, XHR, WebSocket and authentication access paths by best-effort plugin attribution. This is not a sandbox.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Utility"], settings,
    settingsAboutComponent: () => <KcButton onClick={show}>View plugin activity</KcButton>, toolboxActions: { "Plugin activity": show },
    start() {
        active = true; const current = ++generation, enabled = () => active && current === generation;
        const requests = new WeakMap<XMLHttpRequest, string>();
        try {
            dispose.push(RuntimeInterposition.register({ owner: "KittyPluginFirewall", hook: "fetch", priority: -100, wrap: next => function (this: Window, input, init) {
                if (enabled()) { const host = externalHost(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href); if (host) { try { check("fetch", host); } catch (error) { return Promise.reject(error); } } }
                return next.call(this, input, init);
            } }));
            dispose.push(RuntimeInterposition.register({ owner: "KittyPluginFirewall", hook: "xhrOpen", priority: -100, wrap: next => function (this: XMLHttpRequest, method: string, url: string | URL, async = true, user?: string | null, password?: string | null) {
                if (enabled()) { requests.delete(this); const host = externalHost(String(url), location.href); if (host) { requests.set(this, host); check("XHR open", host); } }
                return next.call(this, method, url, async, user, password);
            } }));
            dispose.push(RuntimeInterposition.register({ owner: "KittyPluginFirewall", hook: "xhrSend", priority: -100, wrap: next => function (this: XMLHttpRequest, body) { if (enabled()) { const host = requests.get(this); if (host) check("XHR send", host); } return next.call(this, body); } }));
            dispose.push(RuntimeInterposition.register({ owner: "KittyPluginFirewall", hook: "WebSocket", priority: -100, wrap: next => new Proxy(next, { construct(target, args, newTarget) { if (enabled()) { const host = externalHost(String(args[0]), location.href); if (host) check("WebSocket", host); } return Reflect.construct(target, args, newTarget); } }) }));
            dispose.push(RuntimeInterposition.register({ owner: "KittyPluginFirewall", hook: "storageGetItem", priority: -100, wrap: next => function (this: Storage, key) { if (enabled() && /token/i.test(key)) check("Authentication storage read", "Storage.getItem"); return next.call(this, key); } }));
            dispose.push(RuntimeInterposition.register({ owner: "KittyPluginFirewall", hook: "authGetToken", priority: -100, wrap: next => function (this: object, ...args) { if (enabled()) check("Authentication method call", "AuthenticationStore.getToken"); return next.apply(this, args); } }));
        } catch { active = false; while (dispose.length) dispose.pop()?.(); showToast("Plugin activity hooks could not start on this Discord version."); }
    },
    stop() { active = false; generation++; while (dispose.length) dispose.pop()?.(); events.length = 0; publish(); closePluginPanels("KittyPluginFirewall"); },
    flux: { LOGOUT() { events.length = 0; publish(); closePluginPanels("KittyPluginFirewall"); } }
});
