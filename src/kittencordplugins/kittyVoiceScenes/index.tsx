/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { CompactNotice, KcButton, PrefGroup, PrefRow } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { closePluginPanels, openPluginPanel } from "@utils/kittyPluginPanel";
import definePlugin from "@utils/types";
import { MediaEngineStore, React, SelectedChannelStore, showToast, TextInput, UserStore, useState, VoiceActions, VoiceStateStore } from "@webpack/common";

import { type VoiceScene, voiceScene } from "./scenes";

const settings = definePluginSettings({}).withPrivateSettings<{ accounts?: Record<string, { scenes: VoiceScene[]; channels: Record<string, string>; }>; }>();
let active = false;
function data() { return settings.store.accounts?.[UserStore.getCurrentUser()?.id ?? ""] ?? { scenes: [], channels: {} }; }
function save(value: ReturnType<typeof data>) { const id = UserStore.getCurrentUser()?.id; if (id && active) settings.store.accounts = { ...settings.store.accounts, [id]: value }; }
function apply(value: VoiceScene) {
    const scene = voiceScene(value), channel = SelectedChannelStore.getVoiceChannelId();
    if (!channel || !active) throw new Error("Join a voice channel first.");
    const present = new Set(Object.values(VoiceStateStore.getVoiceStatesForChannel(channel)).map(state => state.userId));
    for (const member of scene.members) if (present.has(member.id) && member.id !== UserStore.getCurrentUser()?.id) {
        VoiceActions.setLocalVolume(member.id, member.volume, "default");
        VoiceActions.setLocalMute(member.id, member.muted, "default");
    }
}
function show() {
    const account = UserStore.getCurrentUser()?.id;
    openPluginPanel("KittyVoiceScenes", "Voice scenes", function Editor() {
        const [name, setName] = useState(""), [error, setError] = useState(""), [, refresh] = useState(0);
        function action(work: () => void) { try { if (!active || account !== UserStore.getCurrentUser()?.id) throw new Error("Your account changed."); work(); setError(""); refresh(value => value + 1); } catch (failure) { setError(failure instanceof Error ? failure.message : "Scene action failed."); } }
        return <><CompactNotice>Scenes change only your local playback volumes and local mutes for people present in your current call. They do not mute anyone's microphone or change server permissions.</CompactNotice><TextInput value={name} onChange={setName} placeholder="Gaming, Music, Meeting…"/><KcButton onClick={() => action(() => {
            const channel = SelectedChannelStore.getVoiceChannelId(); if (!channel) throw new Error("Join a voice channel first.");
            const scene = voiceScene({ name, members: Object.values(VoiceStateStore.getVoiceStatesForChannel(channel)).filter(state => state.userId !== account).map(state => ({ id: state.userId, volume: MediaEngineStore.getLocalVolume(state.userId), muted: MediaEngineStore.isLocalMute(state.userId) })) });
            const current = data(); if (current.scenes.length >= 30 && !current.scenes.some(item => item.name === scene.name)) throw new Error("Keep up to 30 scenes.");
            save({ ...current, scenes: [...current.scenes.filter(item => item.name !== scene.name), scene] });
        })}>Save current mix</KcButton><PrefGroup>{data().scenes.map(scene => <PrefRow key={scene.name} label={scene.name} description={`${scene.members.length} local playback settings`} control={<><KcButton onClick={() => action(() => apply(scene))}>Apply</KcButton><KcButton onClick={() => action(() => {
            const channel = SelectedChannelStore.getVoiceChannelId(); if (!channel) throw new Error("Join the target channel first."); const current = data(); save({ ...current, channels: { ...current.channels, [channel]: current.channels[channel] === scene.name ? "" : scene.name } });
        })}>Toggle auto-apply here</KcButton><KcButton onClick={() => action(() => { const current = data(); save({ scenes: current.scenes.filter(item => item.name !== scene.name), channels: Object.fromEntries(Object.entries(current.channels).filter(([, value]) => value !== scene.name)) }); })}>Delete</KcButton></>}/>)}</PrefGroup>{error && <CompactNotice tone="warning">{error}</CompactNotice>}</>;
    });
}
function follow() { if (!active) return; const channel = SelectedChannelStore.getVoiceChannelId(); if (!channel) return; const current = data(), scene = current.scenes.find(scene => scene.name === current.channels[channel]); if (scene) { try { apply(scene); } catch { showToast("Voice scene could not be applied. Check local voice controls."); } } }
export default definePlugin({
    name: "KittyVoiceScenes", description: "Save named local playback volume and mute mixes, apply them manually, or assign a scene to your voice channels.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Voice", "Utility"], settings,
    settingsAboutComponent: () => <KcButton onClick={show}>Manage voice scenes</KcButton>, toolboxActions: { "Voice scenes": show },
    flux: { VOICE_CHANNEL_SELECT: follow, LOGOUT() { closePluginPanels("KittyVoiceScenes"); } }, start() { active = true; }, stop() { active = false; closePluginPanels("KittyVoiceScenes"); }
});
