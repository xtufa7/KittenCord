/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { CompactNotice } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { React } from "@webpack/common";

import { botGroup } from "./group";

const settings = definePluginSettings({ disabledChannels: { type: OptionType.STRING, default: "", description: "Channel IDs where bot messages stay expanded, separated by commas. Reopen the channel after changing this list." }, disabledBots: { type: OptionType.STRING, default: "", description: "Bot or webhook author IDs to leave expanded, separated by commas. Reopen the channel after changing this list." } });
let active = false;
export default definePlugin({
    name: "KittyBotFold", description: "Fold consecutive messages from the same bot or webhook using Discord's existing expandable message-group renderer. Per-bot and per-channel exclusions.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Chat", "Organisation"], settings,
    settingsAboutComponent: () => <CompactNotice>Uses native expandable groups. Existing blocked and deleted-message groups keep their own behavior. Enabling or removing source patches requires reloading Discord.</CompactNotice>,
    group(message: Message) { return active ? botGroup(message, settings.store.disabledChannels, settings.store.disabledBots) : undefined; },
    label(group: { content?: { content?: Message; }[]; }) {
        const author = group.content?.[0]?.content?.author, name = author?.globalName || author?.username || "bot";
        return () => ({ ast: [[6, "count", { "=0": [`No messages from ${name}`], one: [[1, "count"], ` message from ${name}`], other: [[1, "count"], ` messages from ${name}`] }, 0, "cardinal"]] });
    },
    patches: [
        { find: "NON_COLLAPSIBLE.has(", replacement: { match: /if\((\i)\.blocked\)return \i\.\i\.MESSAGE_GROUP_BLOCKED;/, replace: "$&else if($self.group($1))return $self.group($1);" } },
        { find: "#{intl::NEW_MESSAGES_ESTIMATED_WITH_DATE}", group: true, replacement: [
            { match: /(\i).type===\i\.\i\.MESSAGE_GROUP_BLOCKED\|\|/, replace: '$&$1.type.startsWith("MESSAGE_GROUP_KITTY_BOT_")||' },
            { match: /(\i).type===\i\.\i\.MESSAGE_GROUP_BLOCKED\?(\i)=[^:]{1,400}:/, replace: '$&$1.type.startsWith("MESSAGE_GROUP_KITTY_BOT_")?$2=$self.label($1):' }
        ] }
    ], start() { active = true; }, stop() { active = false; }
});
