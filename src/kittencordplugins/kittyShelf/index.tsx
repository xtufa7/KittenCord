/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { CompactNotice, KcButton, PrefGroup, PrefRow } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import { closePluginPanels, openPluginPanel } from "@utils/kittyPluginPanel";
import definePlugin from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, MessageActions, React, SelectedChannelStore, TextInput, useEffect, UserStore, useState } from "@webpack/common";

import { shelfLinks } from "./links";

interface Entry { id: string; channel: string; message: string; author: string; title: string; url: string; domain: string; type: "Link" | "File"; at: number; }
const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
let revision = 0;
let active = false;
const publish = () => { revision++; for (const listener of listeners) listener(); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
function capture(message: Message) {
    if (!active) return;
    for (const [key, entry] of entries) if (entry.message === message.id) entries.delete(key);
    const common = { channel: message.channel_id, message: message.id, author: message.author.id, at: new Date(message.timestamp).getTime() };
    for (const link of shelfLinks(message.content ?? "")) entries.set(`${message.id}:${link.url}`, { ...common, ...link, id: `${message.id}:${link.url}`, title: link.domain, type: "Link" });
    for (const file of message.attachments ?? []) {
        const links = shelfLinks(file.url);
        if (links[0]) entries.set(`${message.id}:${file.id}`, { ...common, ...links[0], id: `${message.id}:${file.id}`, title: file.filename, type: "File" });
    }
    while (entries.size > 1000) { const first = entries.keys().next().value; if (first) entries.delete(first); }
    publish();
}
function show() {
    const channel = SelectedChannelStore.getChannelId(), guild = ChannelStore.getChannel(channel)?.guild_id;
    openPluginPanel("KittyShelf", "Links and files", function Shelf({ close }) {
        React.useSyncExternalStore(subscribe, () => revision);
        const [query, setQuery] = useState(""), [server, setServer] = useState(false), [files, setFiles] = useState(false);
        const rows = [...entries.values()].filter(entry => (server ? guild && ChannelStore.getChannel(entry.channel)?.guild_id === guild : entry.channel === channel) && (!files || entry.type === "File") && `${entry.title} ${entry.domain}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.at - a.at);
        return <><CompactNotice>Links and files from messages rendered this session. No history or page titles are downloaded. Expired attachment links must be reopened through their message.</CompactNotice><TextInput value={query} onChange={setQuery} placeholder="Search title or domain"/><KcButton disabled={!guild} onClick={() => setServer(value => !value)}>{server ? "Current channel" : "This server"}</KcButton><KcButton onClick={() => setFiles(value => !value)}>{files ? "All items" : "Files only"}</KcButton><PrefGroup>{rows.slice(0, 100).map(entry => <PrefRow key={entry.id} label={entry.title} description={`${entry.type} · ${UserStore.getUser(entry.author)?.globalName || UserStore.getUser(entry.author)?.username || entry.author} · ${new Date(entry.at).toLocaleString()}`} control={<><KcButton onClick={() => { MessageActions.jumpToMessage({ channelId: entry.channel, messageId: entry.message, flash: true }); close(); }}>Jump</KcButton><KcButton onClick={() => { void copyWithToast(entry.url); }}>Copy URL</KcButton></>}/>)}</PrefGroup>{!rows.length && <CompactNotice>No matching items have been viewed this session.</CompactNotice>}</>;
    });
}
function clear() { entries.clear(); publish(); closePluginPanels("KittyShelf"); }
export default definePlugin({
    name: "KittyShelf", description: "A searchable, session-only shelf of links and attachments in messages you viewed, grouped by channel or server. No background fetching.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Organisation", "Utility"], dependencies: ["MessageAccessoriesAPI", "ContextMenuAPI"],
    settingsAboutComponent: () => <KcButton onClick={show}>Open shelf</KcButton>, toolboxActions: { "Links and files": show },
    renderMessageAccessory: props => <ErrorBoundary noop><Observer message={props.message}/></ErrorBoundary>,
    contextMenus: { "channel-context"(children) { children.push(<Menu.MenuItem key="kitty-shelf" id="kitty-shelf" label="Open current-channel shelf" action={show}/>); } },
    flux: {
        LOGOUT: clear,
        MESSAGE_DELETE({ id }: { id: string; }) { for (const [key, entry] of entries) if (entry.message === id) entries.delete(key); publish(); },
        MESSAGE_DELETE_BULK({ ids }: { ids: string[]; }) { for (const [key, entry] of entries) if (ids.includes(entry.message)) entries.delete(key); publish(); }
    }, start() { active = true; }, stop() { active = false; clear(); }
});
function Observer({ message }: { message: Message; }) { useEffect(() => { capture(message); }, [message.id, message.content, message.attachments]); return null; }
