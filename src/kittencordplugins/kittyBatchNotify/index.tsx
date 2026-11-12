/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { isPluginEnabled, plugins } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import { CompactNotice, KcButton } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import type { MessageJSON } from "@vencord/discord-types";
import { React, UserStore } from "@webpack/common";

import { digestText } from "./digest";

let active = false, focus = false, timer: ReturnType<typeof setTimeout> | undefined;
const counts = new Map<string, number>(), seen = new Set<string>();
const settings = definePluginSettings({ minutes: { type: OptionType.SLIDER, default: 10, markers: [1, 5, 10, 15, 30, 60], description: "Minutes between focus notification summaries.", stickToMarkers: true } });
function flush() { clearTimeout(timer); timer = undefined; if (counts.size) void showNotification({ title: "Focus summary", body: digestText(counts), noPersist: true }); counts.clear(); seen.clear(); }
function clear() { clearTimeout(timer); timer = undefined; focus = false; counts.clear(); seen.clear(); }
export default definePlugin({
    name: "KittyBatchNotify", description: "Optional focus mode batches Discord message notifications into local summaries. VIPs bypass it. Other plugins' notifications remain independent.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Notifications", "Utility"], settings,
    patches: [{ find: '"NotificationStore"', replacement: { match: /(?<=MESSAGE_CREATE:function\(\i\)\{)/, replace: "if($self.hold(arguments[0]))return;" } }],
    hold(payload: { message?: MessageJSON; optimistic?: boolean; }) {
        const { message } = payload;
        if (!active || !focus || !message || payload.optimistic || message.author.id === UserStore.getCurrentUser()?.id) return false;
        const vipUsers = plugins.KittyVip?.settings?.store.users;
        if (isPluginEnabled("KittyVip") && typeof vipUsers === "string" && vipUsers.split(/[,\s]+/).filter(id => /^\d{17,20}$/.test(id)).slice(0, 100).includes(message.author.id)) return false;
        if (!seen.has(message.id)) { seen.add(message.id); if (seen.size > 2000) seen.delete(seen.values().next().value ?? ""); counts.set(message.channel_id, (counts.get(message.channel_id) ?? 0) + 1); if (!timer) timer = setTimeout(flush, settings.store.minutes * 60000); }
        return true;
    },
    settingsAboutComponent: () => <><CompactNotice>Focus starts off each session. This hook covers Discord's NotificationStore message path; it does not silence calls, OS alerts or independent plugin notifications.</CompactNotice><KcButton onClick={() => { if (focus) flush(); focus = !focus; void showNotification({ title: "Focus mode", body: focus ? "Message notifications are being collected for a summary." : "Normal message notifications restored.", noPersist: true }); }}>Toggle focus mode</KcButton></>,
    toolboxActions: { "Toggle notification focus": () => { if (focus) flush(); focus = !focus; }, "Show focus summary": flush },
    start() { active = true; }, stop() { active = false; clear(); }, flux: { LOGOUT: clear }
});
