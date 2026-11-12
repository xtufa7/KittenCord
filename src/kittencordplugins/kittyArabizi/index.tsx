/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { CodeIcon } from "@components/Icons";
import { CompactNotice, KcButton, PrefGroup, PrefRow, PrefSwitchRow } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { copyWithToast, insertTextIntoChatInputBox } from "@utils/discord";
import { closePluginPanels, openPluginPanel } from "@utils/kittyPluginPanel";
import definePlugin from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { ComponentDispatch, DraftStore, DraftType, Menu, React, SelectedChannelStore, TextArea, UserStore, useState } from "@webpack/common";

import { arabiziOptions, completedWord, toArabic, toArabizi } from "./transliterate";

let active = false;
const settings = definePluginSettings({}).withPrivateSettings<{ accounts?: Record<string, string[]>; }>();
let suggestion: { text: string; channel: string; value: NonNullable<ReturnType<typeof completedWord>>; } | undefined;
let revision = 0;
const listeners = new Set<() => void>();
const publish = () => { revision++; for (const listener of listeners) listener(); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
function enabledHere(channel: string) { return settings.store.accounts?.[UserStore.getCurrentUser()?.id ?? ""]?.includes(channel) ?? false; }
function applyWord(text: string, channel: string, value: string) { if (!active || channel !== SelectedChannelStore.getChannelId() || text !== DraftStore.getDraft(channel, DraftType.ChannelMessage)) return; ComponentDispatch.dispatchToLastSubscribed("CLEAR_TEXT"); insertTextIntoChatInputBox(value); suggestion = undefined; publish(); }
function live(event: KeyboardEvent) {
    if (!active || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || ![" ", ".", ",", "!", "?"].includes(event.key) || !(event.target instanceof HTMLElement)) return;
    const editor = event.target.closest('[role="textbox"]'), selection = window.getSelection(), channel = SelectedChannelStore.getChannelId();
    if (!editor || !selection?.rangeCount || !selection.isCollapsed || !enabledHere(channel)) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.endContainer)) return;
    const remaining = range.cloneRange(); remaining.selectNodeContents(editor); remaining.setStart(range.endContainer, range.endOffset); if (remaining.toString()) return;
    const text = DraftStore.getDraft(channel, DraftType.ChannelMessage), value = completedWord(text);
    if (!value) return;
    if (value.options.length > 1) { suggestion = { text, channel, value }; publish(); }
    else applyWord(text, channel, value.prefix + value.options[0] + value.suffix);
}
function show() {
    const channel = SelectedChannelStore.getChannelId(), account = UserStore.getCurrentUser()?.id;
    const source = DraftStore.getDraft(channel, DraftType.ChannelMessage);
    openPluginPanel("KittyArabizi", "Arabizi", function Editor({ close }) {
        const [text, setText] = useState(source), [error, setError] = useState("");
        const options = [...new Set(text.match(/[a-z2356789][a-z2356789']*/gi) ?? [])].filter(word => arabiziOptions(word).length > 1).slice(0, 10);
        return <><CompactNotice>Live mode converts completed words while typing at the end of the composer. Ambiguous words get choices beside the composer button. Links and code are preserved. Ctrl+Shift+A opens this review.</CompactNotice><PrefSwitchRow label="Live conversion in this channel" value={enabledHere(channel)} onChange={enabled => { const id = UserStore.getCurrentUser()?.id; if (!id || id !== account) return; const channels = settings.store.accounts?.[id] ?? []; settings.store.accounts = { ...settings.store.accounts, [id]: enabled ? [...new Set([...channels, channel])].slice(-500) : channels.filter(value => value !== channel) }; publish(); setError(enabled ? "Live conversion enabled in this channel." : "Live conversion disabled."); }}/><TextArea value={text} onChange={setText} placeholder="ana b7eb 3arabi"/><PrefGroup title="Arabic preview"><PrefRow label={<span dir="auto">{toArabic(text)}</span>}/></PrefGroup>{options.map(word => <PrefGroup key={word} title={word}>{arabiziOptions(word).map(option => <KcButton key={option} onClick={() => setText(value => value.replaceAll(word, option))}>{option}</KcButton>)}</PrefGroup>)}<KcButton onClick={() => {
            if (!active || account !== UserStore.getCurrentUser()?.id || channel !== SelectedChannelStore.getChannelId() || source !== DraftStore.getDraft(channel, DraftType.ChannelMessage)) { setError("Your draft or channel changed. Open Arabizi again."); return; }
            ComponentDispatch.dispatchToLastSubscribed("CLEAR_TEXT"); insertTextIntoChatInputBox(toArabic(text)); close();
        }}>Replace draft</KcButton><KcButton onClick={() => { void copyWithToast(toArabic(text)); }}>Copy Arabic</KcButton>{error && <CompactNotice tone="warning">{error}</CompactNotice>}</>;
    });
}
function keydown(event: KeyboardEvent) { if (event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey && !event.repeat && !event.isComposing && event.code === "KeyA") { event.preventDefault(); show(); } }
const ArabiziButton = ErrorBoundary.wrap(({ channel }: { channel: import("@vencord/discord-types").Channel; }) => {
        React.useSyncExternalStore(subscribe, () => revision);
        const choice = suggestion?.channel === channel.id ? suggestion : undefined;
        return <><ChatBarButton tooltip={enabledHere(channel.id) ? "Arabizi · live conversion enabled" : "Arabizi"} onClick={show}><CodeIcon width={20} height={20}/></ChatBarButton>{choice && <span className="kc-premium-settings">{choice.value.options.map(option => <KcButton key={option} onClick={() => applyWord(choice.text, choice.channel, choice.value.prefix + option + choice.value.suffix)}>{option}</KcButton>)}<KcButton onClick={() => { suggestion = undefined; publish(); }}>Dismiss</KcButton></span>}</>;
    }, { noop: true });
export default definePlugin({
    name: "KittyArabizi", description: "Review local Franco-Arabic transliteration with ambiguous-word choices. Open with Ctrl+Shift+A or the composer button; reverse conversion is available on messages.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Chat", "Utility"], dependencies: ["ChatInputButtonAPI", "ContextMenuAPI"], settings,
    chatBarButton: { icon: CodeIcon, render: props => <ArabiziButton {...props}/> },
    contextMenus: { message(children, { message }: { message: Message; }) { children.push(<Menu.MenuItem key="kitty-arabizi" id="kitty-arabizi" label="Copy as Arabizi" action={() => { void copyWithToast(toArabizi(message.content)); }}/>); } },
    flux: { LOGOUT() { suggestion = undefined; publish(); closePluginPanels("KittyArabizi"); }, CHANNEL_SELECT() { suggestion = undefined; publish(); } },
    start() { active = true; document.addEventListener("keydown", keydown, true); document.addEventListener("keyup", live, true); },
    stop() { active = false; document.removeEventListener("keydown", keydown, true); document.removeEventListener("keyup", live, true); suggestion = undefined; publish(); closePluginPanels("KittyArabizi"); }
});
