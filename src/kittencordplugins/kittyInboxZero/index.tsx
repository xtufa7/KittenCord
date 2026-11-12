/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { CompactNotice, KcButton, PrefGroup, PrefRow } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { closePluginPanels, openPluginPanel } from "@utils/kittyPluginPanel";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelActions, ChannelStore, GuildStore, MessageStore, React, ReadStateStore, ReadStateUtils, TextInput, useState, useStateFromStores } from "@webpack/common";

import { idList, inboxRank } from "./rank";

const settings = definePluginSettings({
    vips: { type: OptionType.STRING, default: "", description: "VIP user IDs, separated by commas." },
    keywords: { type: OptionType.STRING, default: "", description: "Priority keywords, separated by commas. Only the most recent already-loaded message is checked." },
    servers: { type: OptionType.STRING, default: "", description: "Server IDs in preferred order, separated by commas." }
});
function show() {
    openPluginPanel("KittyInboxZero", "Inbox Zero", function Inbox({ close }) {
        const [query, setQuery] = useState("");
        const { vips, keywords, servers } = settings.use(["vips", "keywords", "servers"]);
        const ranked = useStateFromStores([ReadStateStore, ChannelStore, MessageStore, GuildStore], () => {
            const people = idList(vips), priority = idList(servers), words = keywords.toLowerCase().split(",").map(word => word.trim()).filter(Boolean);
            return ReadStateStore.getAllReadStates(true).filter(state => ReadStateStore.hasUnreadOrMentions(state.channelId) && ChannelStore.hasChannel(state.channelId)).map(state => {
                const channel = ChannelStore.getChannel(state.channelId), message = MessageStore.getLastMessage(channel.id), mentions = ReadStateStore.getMentionCount(channel.id);
                return { channel, mentions, score: inboxRank({ mentions, vip: !!message && people.includes(message.author.id), keyword: !!message && words.some(word => message.content.toLowerCase().includes(word)), serverIndex: priority.indexOf(channel.guild_id) }) };
            }).sort((a, b) => b.score - a.score || a.channel.id.localeCompare(b.channel.id));
        }, [vips, keywords, servers]);
        const visible = ranked.filter(row => `${row.channel.name} ${GuildStore.getGuild(row.channel.guild_id)?.name ?? "Direct messages"}`.toLowerCase().includes(query.toLowerCase()));
        return <><CompactNotice>Unread channels from Discord's existing read state. Mentions come first, then VIPs, loaded-message keywords and your server order. No history is fetched.</CompactNotice><TextInput value={query} onChange={setQuery} placeholder="Search unread channels"/><PrefGroup>{visible.slice(0, 200).map(({ channel, mentions }) => <PrefRow key={channel.id} label={channel.name || "Direct message"} description={GuildStore.getGuild(channel.guild_id)?.name ?? "Direct messages"} detail={mentions ? `${mentions} mentions` : "Unread"} control={<><KcButton onClick={() => { ChannelActions.selectChannel(channel.id); close(); }}>Open</KcButton><KcButton onClick={() => ReadStateUtils.ackChannel(channel)}>Mark read</KcButton></>}/>)}</PrefGroup>{!visible.length && <CompactNotice>No unread channels match.</CompactNotice>}</>;
    });
}
export default definePlugin({
    name: "KittyInboxZero", description: "A prioritized unread-channel inbox using Discord's own read state, with explicit jump and mark-read actions.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Organisation", "Utility"], settings,
    settingsAboutComponent: () => <KcButton onClick={show}>Open Inbox Zero</KcButton>, toolboxActions: { "Inbox Zero": show },
    flux: { LOGOUT() { closePluginPanels("KittyInboxZero"); } }, stop() { closePluginPanels("KittyInboxZero"); }
});
