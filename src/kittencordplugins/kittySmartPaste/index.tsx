/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton } from "@api/ChatButtons";
import ErrorBoundary from "@components/ErrorBoundary";
import { CodeIcon } from "@components/Icons";
import { CompactNotice, KcButton } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { closeModal, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { ChannelStore, ComponentDispatch, DraftStore, DraftType, React, SelectedChannelStore, UploadHandler, UserStore, useState } from "@webpack/common";

import { codeBlock, markdownTable, prettyJson, replaceUnique } from "./format";
import style from "./style.css?managed";

let pasted: { text: string; channel: string; account: string; } | undefined;
let active = false;
const modals = new Set<string>();
function paste(event: ClipboardEvent) {
    if (!(event.target instanceof HTMLElement) || !event.target.closest('[role="textbox"]')) return;
    const text = event.clipboardData?.getData("text/plain") ?? "", channel = SelectedChannelStore.getChannelId(), account = UserStore.getCurrentUser()?.id;
    if (text.length >= 40 && text.length <= 50000 && channel && account) pasted = { text, channel, account };
}
function prettyXml(text: string) {
    if (text.length > 50000 || /<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error("XML with declarations or entities is not supported.");
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("This is not valid XML.");
    let depth = 0;
    return codeBlock(new XMLSerializer().serializeToString(doc).replace(/>\s*</g, ">\n<").split("\n").map(line => {
        if (/^<\//.test(line)) depth = Math.max(0, depth - 1);
        const result = "  ".repeat(Math.min(depth, 32)) + line;
        if (/^<[^!?/][^>]*>/.test(line) && !/\/>$|<\//.test(line)) depth++;
        return result;
    }).join("\n"), "xml");
}
function show() {
    const captured = pasted;
    if (!captured || captured.channel !== SelectedChannelStore.getChannelId()) return;
    const key = openModal(props => <Review {...props} captured={captured}/>, { onCloseCallback() { modals.delete(key); } });
    modals.add(key);
}
const Review = ErrorBoundary.wrap(function Review({ captured, onClose, ...props }: Parameters<Parameters<typeof openModal>[0]>[0] & { captured: NonNullable<typeof pasted>; }) {
    const [preview, setPreview] = useState(""), [error, setError] = useState(""), [draft, setDraft] = useState("");
    function prepare(convert: (text: string) => string) {
        try { const current = DraftStore.getDraft(captured.channel, DraftType.ChannelMessage); setPreview(replaceUnique(current, captured.text, convert(captured.text))); setDraft(current); setError(""); }
        catch (failure) { setError(failure instanceof Error ? failure.message : "Conversion failed."); }
    }
    function valid() { return active && captured.account === UserStore.getCurrentUser()?.id && captured.channel === SelectedChannelStore.getChannelId(); }
    return <ModalRoot {...props} className="kc-premium-settings vc-kitty-smart-paste"><ModalHeader>Format pasted text</ModalHeader><ModalContent><CompactNotice>Normal paste is unchanged. Review a conversion before replacing your draft. Nothing is sent.</CompactNotice><div className="vc-kitty-smart-paste-actions"><KcButton onClick={() => prepare(prettyJson)}>JSON</KcButton><KcButton onClick={() => prepare(prettyXml)}>XML</KcButton><KcButton onClick={() => prepare(markdownTable)}>Table</KcButton><KcButton onClick={() => prepare(text => codeBlock(text))}>Code block</KcButton><KcButton onClick={() => {
        if (!valid()) return;
        const channel = ChannelStore.getChannel(captured.channel);
        if (channel) UploadHandler.promptToUpload([new File([captured.text], "pasted-text.txt", { type: "text/plain" })], channel, DraftType.ChannelMessage);
    }}>Attach as text file</KcButton></div>{error && <CompactNotice tone="warning">{error}</CompactNotice>}{preview && <pre>{preview}</pre>}</ModalContent><ModalFooter><KcButton onClick={onClose}>Cancel</KcButton><KcButton disabled={!preview} level="primary" onClick={() => {
        if (!valid() || DraftStore.getDraft(captured.channel, DraftType.ChannelMessage) !== draft) { setError("Your draft or channel changed. Review the conversion again."); return; }
        ComponentDispatch.dispatchToLastSubscribed("CLEAR_TEXT"); insertTextIntoChatInputBox(preview); pasted = undefined; onClose();
    }}>Replace draft</KcButton></ModalFooter></ModalRoot>;
}, { noop: true });
function clear() { pasted = undefined; for (const key of modals) closeModal(key); modals.clear(); }
const PasteButton = ErrorBoundary.wrap(() => <ChatBarButton tooltip="Format recent paste" onClick={show}><CodeIcon width={20} height={20}/></ChatBarButton>, { noop: true });
export default definePlugin({
    name: "KittySmartPaste", description: "Offer local JSON, XML, table and code formatting for pasted text, or attach it as a text file. Never blocks ordinary paste or sends messages.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Chat", "Utility"], dependencies: ["ChatInputButtonAPI"], managedStyle: style,
    chatBarButton: { icon: CodeIcon, render: props => <PasteButton {...props}/> },
    flux: { LOGOUT: clear, CHANNEL_SELECT() { pasted = undefined; } },
    start() { active = true; document.addEventListener("paste", paste, true); },
    stop() { active = false; document.removeEventListener("paste", paste, true); clear(); }
});
