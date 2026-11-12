/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { CompactNotice, KcButton } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { closePluginPanels, openPluginPanel } from "@utils/kittyPluginPanel";
import definePlugin, { OptionType, type PluginNative } from "@utils/types";
import { ChannelStore, React, SelectedChannelStore, showToast, TextInput, useEffect, UserStore, useState } from "@webpack/common";

import { parseLanguages } from "./languages";

const native = VencordNative.pluginHelpers.KittySpellSwitch as PluginNative<typeof import("./native")>;
const settings = definePluginSettings({
    downloads: { type: OptionType.BOOLEAN, default: false, description: "Allow Electron to download missing dictionaries from Chromium's dictionary CDN (redirector.gvt1.com and its Google download mirrors). No draft text is sent.", onChange(value) { if (value) void follow(); else void native.restore().catch(() => { showToast("Previous spellcheck languages could not be restored."); }); } }
}).withPrivateSettings<{ channels?: Record<string, string[]>; guilds?: Record<string, string[]>; }>();
let active = false, epoch = 0;
function scope(guild = false) {
    const account = UserStore.getCurrentUser()?.id, channel = SelectedChannelStore.getChannelId();
    const id = guild ? ChannelStore.getChannel(channel)?.guild_id : channel;
    return account && id ? `${account}:${id}` : "";
}
async function follow() {
    const current = ++epoch;
    if (!active || !settings.store.downloads) return;
    const languages = settings.store.channels?.[scope()] ?? settings.store.guilds?.[scope(true)];
    try {
        const result = languages ? await native.apply(languages, true) : await native.restore();
        if (active && current === epoch && result.error) showToast(result.error);
    } catch { if (active && current === epoch) showToast("Native spellcheck is unavailable on this Discord build."); }
}
function show() {
    const channel = scope(), guild = scope(true);
    openPluginPanel("KittySpellSwitch", "Spellcheck language", function Editor() {
        const [supported, setSupported] = useState<string[]>([]), [error, setError] = useState("");
        const [value, setValue] = useState((settings.store.channels?.[channel] ?? settings.store.guilds?.[guild] ?? []).join(", "));
        useEffect(() => { let alive = true; void native.info().then(info => { if (alive) { setSupported(info.supported); setError(info.error); } }, () => { if (alive) setError("Native spellcheck is unavailable."); }); return () => { alive = false; }; }, []);
        function save(server: boolean) {
            try {
                if (!active || channel !== scope()) throw new Error("The active channel changed. Reopen this panel.");
                const languages = parseLanguages(value, supported), key = server ? guild : channel;
                if (!key) throw new Error("Open a supported channel first.");
                const records = { ...(server ? settings.store.guilds : settings.store.channels) };
                if (languages.length) records[key] = languages; else delete records[key];
                if (server) settings.store.guilds = records; else settings.store.channels = records;
                setError(""); void follow();
            } catch (failure) { setError(failure instanceof Error ? failure.message : "Language preference was not saved."); }
        }
        return <><CompactNotice>Channel preferences override server preferences. Blank removes the override. No text leaves Discord. Missing dictionaries are downloaded by Electron only after the download setting is enabled.</CompactNotice><TextInput value={value} onChange={setValue} placeholder="en-US, ar"/><KcButton disabled={!supported.length} onClick={() => save(false)}>Save for channel</KcButton><KcButton disabled={!supported.length || !guild} onClick={() => save(true)}>Save for server</KcButton><CompactNotice>Supported: {supported.join(", ") || "Not available"}</CompactNotice>{error && <CompactNotice tone="warning">{error}</CompactNotice>}</>;
    });
}
export default definePlugin({
    name: "KittySpellSwitch", description: "Remember channel and server spellcheck languages on Windows and Linux. Optional dictionary downloads use Chromium's Google CDN; draft text is never uploaded.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Chat", "Utility"], settings,
    settingsAboutComponent: () => <KcButton onClick={show}>Set current channel language</KcButton>, toolboxActions: { "Spellcheck language": show },
    flux: { CHANNEL_SELECT() { void follow(); }, LOGOUT() { epoch++; closePluginPanels("KittySpellSwitch"); void native.restore().catch(() => { showToast("Previous spellcheck languages could not be restored."); }); } },
    start() { active = true; void follow(); },
    stop() { active = false; epoch++; closePluginPanels("KittySpellSwitch"); void native.restore().catch(() => { showToast("Previous spellcheck languages could not be restored."); }); }
});
