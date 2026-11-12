/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { CompactNotice, KcButton } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { closeAllModals, closeModal, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { ApplicationStreamingStore, ChannelActions, ChannelStore, MediaEngineStore, React, SelectedChannelStore, showToast, UserStore, VoiceActions } from "@webpack/common";

import { matchesPanicKey } from "./shortcut";
import style from "./style.css?managed";

const settings = definePluginSettings({
    key: { type: OptionType.STRING, default: "P", description: "Letter used with Ctrl+Shift while Discord is focused.", isValid: value => typeof value === "string" && /^[a-z]$/i.test(value) || "Choose one letter." },
    deafen: { type: OptionType.BOOLEAN, default: true, description: "Deafen as well as mute during panic mode." },
    safeChannel: { type: OptionType.STRING, default: "", description: "Optional text channel ID to open during panic mode.", isValid: value => typeof value === "string" && (!value || /^\d{17,20}$/.test(value)) || "Enter a channel ID or leave blank." }
});
const stopStream: (key: string) => void = findByCodeLazy('type:"STREAM_STOP"');
let snapshot: { muted: boolean; deafened: boolean; channel: string; voice: string | undefined; account: string; } | undefined;
let modal: string | undefined;
let busy = false;
let active = false, generation = 0;

async function toggle() {
    if (busy || !active) return;
    const current = generation;
    busy = true;
    try {
        if (snapshot) {
            const previous = snapshot;
            snapshot = undefined;
            if (modal) closeModal(modal);
            modal = undefined;
            if (previous.account !== UserStore.getCurrentUser()?.id) return;
            if (previous.voice === SelectedChannelStore.getVoiceChannelId()) {
                if (MediaEngineStore.isSelfDeaf() && !previous.deafened) await VoiceActions.toggleSelfDeaf();
                if (!active || generation !== current) return;
                if (MediaEngineStore.isSelfMute() && !previous.muted) await VoiceActions.toggleSelfMute();
            }
            if (!active || generation !== current) return;
            if (settings.store.safeChannel === SelectedChannelStore.getChannelId() && ChannelStore.getChannel(previous.channel)) ChannelActions.selectChannel(previous.channel);
            return;
        }
        const user = UserStore.getCurrentUser();
        if (!user) return;
        snapshot = { muted: MediaEngineStore.isSelfMute(), deafened: MediaEngineStore.isSelfDeaf(), channel: SelectedChannelStore.getChannelId(), voice: SelectedChannelStore.getVoiceChannelId(), account: user.id };
        if (!snapshot.muted) await VoiceActions.toggleSelfMute();
        if (!active || generation !== current) return;
        if (settings.store.deafen && !MediaEngineStore.isSelfDeaf()) await VoiceActions.toggleSelfDeaf();
        if (!active || generation !== current) return;
        const stream = ApplicationStreamingStore.getCurrentUserActiveStream();
        const streamKey = stream && ApplicationStreamingStore.getState().activeStreams.find(([, value]) => value.ownerId === user.id)?.[0];
        if (streamKey) stopStream(streamKey);
        closeAllModals();
        const safe = settings.store.safeChannel;
        const channel = safe && ChannelStore.getChannel(safe);
        if (channel && ![2, 13].includes(channel.type)) ChannelActions.selectChannel(safe);
        modal = openModal(props => <ModalRoot {...props} className="kc-premium-settings vc-kitty-panic-key"><ModalHeader>Privacy screen</ModalHeader><ModalContent><CompactNotice>{MediaEngineStore.isSelfMute() ? "Microphone muted." : "Microphone could not be muted. Use Discord's mute control."} Stopped streams must be restarted manually. This screen does not hide operating system notifications.</CompactNotice></ModalContent><ModalFooter><KcButton onClick={() => { void toggle(); }}>Restore voice controls</KcButton></ModalFooter></ModalRoot>, { onCloseCallback() { modal = undefined; } });
    } catch { showToast("Panic mode could not complete. Check Discord's microphone and stream controls."); }
    finally { if (generation === current) busy = false; }
}
function keydown(event: KeyboardEvent) {
    if (!matchesPanicKey(event, settings.store.key)) return;
    event.preventDefault();
    void toggle();
}
function dismiss() { generation++; busy = false; snapshot = undefined; if (modal) closeModal(modal); modal = undefined; }

export default definePlugin({
    name: "KittyPanicKey", description: "A focused-window privacy shortcut that mutes, optionally deafens, stops your stream and covers Discord. Stopped streams are never restarted automatically.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Utility", "Voice"], settings, managedStyle: style,
    settingsAboutComponent: () => <CompactNotice>Ctrl+Shift+{settings.store.key}. Press again to restore previous voice controls. Disabling the plugin keeps your microphone muted; unmute manually.</CompactNotice>,
    toolboxActions: { "Toggle privacy screen": () => { void toggle(); } },
    flux: { LOGOUT: dismiss },
    start() { active = true; generation++; document.addEventListener("keydown", keydown, true); },
    stop() { active = false; document.removeEventListener("keydown", keydown, true); dismiss(); }
});
