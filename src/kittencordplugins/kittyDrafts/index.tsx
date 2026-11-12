/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton } from "@api/ChatButtons";
import { get, set } from "@api/DataStore";
import ErrorBoundary from "@components/ErrorBoundary";
import { ClockIcon } from "@components/Icons";
import { CompactNotice, KcButton, PrefGroup, PrefRow } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { closeModal, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Alerts, ChannelActions, ChannelStore, ComponentDispatch, DraftStore, DraftType, React, SelectedChannelStore, TextInput, UserStore, useState, useStateFromStores } from "@webpack/common";

import { type DraftVersion, parseHistory, rememberDraft } from "./history";
import style from "./style.css?managed";

let history: DraftVersion[] = [], account = "", epoch = 0, active = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let writes = Promise.resolve();
const modals = new Set<string>();
let failure = "";
function save() {
    clearTimeout(timer);
    if (!account) return;
    const key = `KittenCord:Drafts:${account}`, value = history;
    writes = writes.then(() => set(key, value)).catch(() => { failure = "Draft history could not be saved. Existing stored data was preserved."; });
}
function record() {
    if (!active || !account || account !== UserStore.getCurrentUser()?.id) return;
    const channel = SelectedChannelStore.getChannelId();
    if (!channel) return;
    const next = rememberDraft(history, channel, DraftStore.getDraft(channel, DraftType.ChannelMessage), Date.now(), crypto.randomUUID());
    if (next === history) return;
    history = next;
    clearTimeout(timer);
    timer = setTimeout(save, 750);
}
async function connect() {
    const current = ++epoch, id = UserStore.getCurrentUser()?.id;
    save(); account = ""; history = [];
    if (!id) return;
    try {
        await writes;
        const stored = await get(`KittenCord:Drafts:${id}`);
        if (!active || current !== epoch) return;
        history = parseHistory(stored); account = id; failure = ""; record();
    } catch { failure = "Draft history could not load. Recording is paused to protect saved data."; }
}
const History = ErrorBoundary.wrap(function History({ channel, onClose, ...props }: Parameters<Parameters<typeof openModal>[0]>[0] & { channel?: string; }) {
    const [query, setQuery] = useState(""), [all, setAll] = useState(!channel);
    const current = useStateFromStores([SelectedChannelStore], () => SelectedChannelStore.getChannelId());
    const rows = history.filter(entry => (all || entry.channel === channel) && entry.text.toLowerCase().includes(query.toLowerCase())).slice(0, 100);
    return <ModalRoot {...props} className="kc-premium-settings vc-kitty-drafts"><ModalHeader>Draft history</ModalHeader><ModalContent><CompactNotice>Saved on this device for your account. Up to 20 versions per channel, 2,000 total. Attachments and replies are not archived.</CompactNotice>{failure && <CompactNotice tone="warning">{failure}</CompactNotice>}<TextInput value={query} onChange={setQuery} placeholder="Search draft text"/><KcButton onClick={() => setAll(value => !value)}>{all ? "Current channel" : "All channels"}</KcButton><PrefGroup>{rows.map(entry => <PrefRow key={entry.id} label={ChannelStore.getChannel(entry.channel)?.name || "Direct message"} description={new Date(entry.at).toLocaleString()} control={<KcButton onClick={() => {
        if (entry.channel !== current) { ChannelActions.selectChannel(entry.channel); return; }
        Alerts.show({ title: "Restore this draft?", body: "This replaces the current text. The existing text is kept in draft history.", confirmText: "Restore", cancelText: "Cancel", onConfirm() {
            if (entry.channel !== SelectedChannelStore.getChannelId() || account !== UserStore.getCurrentUser()?.id || !active) return;
            record(); ComponentDispatch.dispatchToLastSubscribed("CLEAR_TEXT"); insertTextIntoChatInputBox(entry.text); onClose();
        } });
    }}>{entry.channel === current ? "Restore" : "Open channel"}</KcButton>}><pre>{entry.text}</pre></PrefRow>)}</PrefGroup>{!rows.length && <CompactNotice>No saved drafts match.</CompactNotice>}</ModalContent><ModalFooter><KcButton onClick={onClose}>Close</KcButton><KcButton onClick={() => Alerts.show({ title: "Clear draft history?", body: "Your current Discord drafts stay unchanged.", confirmText: "Clear history", cancelText: "Cancel", onConfirm() { if (account !== UserStore.getCurrentUser()?.id) return; history = []; save(); onClose(); } })}>Clear history</KcButton></ModalFooter></ModalRoot>;
}, { noop: true });
function show(channel?: string) { const key = openModal(props => <History {...props} channel={channel}/>, { onCloseCallback() { modals.delete(key); } }); modals.add(key); }
function disconnect() { epoch++; save(); account = ""; history = []; for (const key of modals) closeModal(key); modals.clear(); }

const HistoryButton = ErrorBoundary.wrap(({ channel }: { channel: import("@vencord/discord-types").Channel; }) => <ChatBarButton tooltip="Draft history" onClick={() => show(channel.id)}><ClockIcon height={20} width={20}/></ChatBarButton>, { noop: true });
export default definePlugin({
    name: "KittyDrafts", description: "Keep searchable local snapshots of your own text drafts, with 20 versions per channel and explicit restoration.", authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false,
    tags: ["Chat", "Utility"], dependencies: ["ChatInputButtonAPI"], managedStyle: style,
    chatBarButton: { icon: ClockIcon, render: props => <HistoryButton {...props}/> },
    settingsAboutComponent: () => <KcButton onClick={() => show()}>Search draft history</KcButton>,
    flux: { CONNECTION_OPEN() { void connect(); }, LOGOUT: disconnect },
    start() { active = true; DraftStore.addChangeListener(record); void connect(); },
    stop() { active = false; DraftStore.removeChangeListener(record); disconnect(); }
});
