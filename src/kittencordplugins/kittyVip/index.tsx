/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import type { MessageJSON } from "@vencord/discord-types";
import { ChannelActions, ChannelStore, Menu, React, SelectedChannelStore, UserStore } from "@webpack/common";

import { vipIds, vipMessage } from "./match";
import style from "./style.css?managed";

export const settings = definePluginSettings({
    users: { type: OptionType.STRING, default: "", description: "VIP user IDs, separated by commas. Their DMs and mentions get local alerts, including while Discord is in Do Not Disturb." },
    sound: { type: OptionType.BOOLEAN, default: false, description: "Play a quiet local tone for VIP DMs and mentions, independently of Discord notification sounds." }
});
let audio: AudioContext | undefined;
const recent = new Set<string>();
const cooldown = new Map<string, number>();
export function isVip(id: string) { return vipIds(settings.store.users).has(id); }
function clear() { recent.clear(); cooldown.clear(); if (audio) void audio.close().catch(() => {}); audio = undefined; }
function chime() {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume().catch(() => {});
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.frequency.value = 660; gain.gain.setValueAtTime(0.05, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.25);
    oscillator.connect(gain).connect(audio.destination); oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); }; oscillator.start(); oscillator.stop(audio.currentTime + 0.25);
}
export default definePlugin({
    name: "KittyVip", description: "Mark VIPs locally and give their DMs or mentions a distinct optional tone and local alert. Server notification settings and presence remain unchanged.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Chat", "Notifications"], settings, managedStyle: style,
    renderMessageDecoration: ({ message }) => <ErrorBoundary noop>{isVip(message.author.id) ? <span className="vc-kitty-vip">VIP</span> : null}</ErrorBoundary>,
    contextMenus: { "user-context"(children, { user }: { user?: { id: string; }; }) { if (user && user.id !== UserStore.getCurrentUser()?.id) children.push(<Menu.MenuCheckboxItem key="kitty-vip" id="kitty-vip" label="VIP" checked={isVip(user.id)} action={() => { const ids = vipIds(settings.store.users); if (ids.has(user.id)) ids.delete(user.id); else ids.add(user.id); settings.store.users = [...ids].join(","); }}/>); } },
    flux: {
        MESSAGE_CREATE({ message, optimistic, isPushNotification }: { message: MessageJSON; optimistic?: boolean; isPushNotification?: boolean; }) {
            const self = UserStore.getCurrentUser()?.id, channel = ChannelStore.getChannel(message.channel_id);
            if (!self || !channel || optimistic || isPushNotification || recent.has(message.id) || !vipMessage(message.author.id, channel.isPrivate(), message.mentions.map(user => user.id), self, vipIds(settings.store.users))) return;
            recent.add(message.id); if (recent.size > 200) recent.delete(recent.values().next().value ?? "");
            if (SelectedChannelStore.getChannelId() === channel.id || Date.now() - (cooldown.get(message.author.id) ?? 0) < 10000) return;
            cooldown.set(message.author.id, Date.now()); if (settings.store.sound) chime();
            void showNotification({ title: "VIP message", body: `${message.author.globalName || message.author.username} sent a DM or mentioned you.`, noPersist: true, onClick: () => ChannelActions.selectChannel(channel.id) });
        }, LOGOUT: clear
    }, stop: clear
});
