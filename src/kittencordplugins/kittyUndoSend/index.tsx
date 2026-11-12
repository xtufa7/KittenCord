/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { type ChatBarButtonFactory } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { ClockIcon } from "@components/Icons";
import { CompactNotice, KcButton } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { DraftStore, DraftType, PendingReplyStore, React, SelectedChannelStore, UploadAttachmentStore, useEffect, UserStore, useState } from "@webpack/common";

import { holdSend } from "./hold";
import style from "./style.css?managed";

const settings = definePluginSettings({ seconds: { type: OptionType.SLIDER, description: "Seconds to keep a user-submitted message pending before continuing its normal send.", default: 5, markers: [3, 5, 8, 10, 15], stickToMarkers: true } });
let active = false;
let countdown: ReturnType<typeof setInterval> | undefined;
let pending: ReturnType<typeof holdSend> | undefined;
const views = new Set<() => void>();
const refresh = () => { for (const view of views) view(); };
function cancel() { pending?.finish(false); }
function keydown(event: KeyboardEvent) {
    if (!pending || event.isComposing || event.repeat || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.key !== "Enter") return;
    if (!(event.target instanceof HTMLElement) || !event.target.closest('[role="textbox"]')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    pending.finish(true);
}
const PendingButton = ErrorBoundary.wrap(function PendingButton({ channel }: Parameters<ChatBarButtonFactory>[0]) {
    const [, update] = useState(0);
    useEffect(() => {
        const view = () => update(value => value + 1);
        views.add(view);
        return () => { views.delete(view); };
    }, []);
    if (!pending || channel.id !== SelectedChannelStore.getChannelId()) return null;
    return <div className="kc-premium-settings vc-kitty-undo-send" role="status"><span>Sending in {Math.max(0, Math.ceil((pending.deadline - Date.now()) / 1000))}s</span><KcButton onClick={cancel}>Undo</KcButton></div>;
}, { noop: true });

export default definePlugin({
    name: "KittyUndoSend", description: "Hold your submitted messages briefly. Undo keeps the original draft, reply and attachments. Enter again sends sooner.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false,
    tags: ["Chat", "Utility"], dependencies: ["MessageEventsAPI", "ChatInputButtonAPI"], settings, managedStyle: style,
    settingsAboutComponent: () => <CompactNotice>Only delays sends you initiate. Switching channels, editing the draft or disabling this plugin cancels the pending send.</CompactNotice>,
    chatBarButton: { icon: ClockIcon, render: props => <PendingButton {...props}/> },
    flux: { CHANNEL_SELECT() { cancel(); }, LOGOUT() { cancel(); }, DRAFT_SAVE() { if (pending) refresh(); } },
    start() { active = true; document.addEventListener("keydown", keydown, true); },
    stop() { active = false; cancel(); clearInterval(countdown); countdown = undefined; document.removeEventListener("keydown", keydown, true); },
    async onBeforeMessageSend(channelId, message, options) {
        if (!active) return;
        if (pending) return { cancel: true };
        const account = UserStore.getCurrentUser()?.id;
        const { content } = message, draft = DraftStore.getDraft(channelId, DraftType.ChannelMessage);
        const reply = PendingReplyStore.getPendingReply(channelId)?.message?.id;
        const uploads = UploadAttachmentStore.getUploads(channelId, DraftType.ChannelMessage).map(upload => upload.id).join(",");
        const hold = holdSend(settings.store.seconds * 1000, () => active && account === UserStore.getCurrentUser()?.id && channelId === SelectedChannelStore.getChannelId()
            && message.content === content && draft === DraftStore.getDraft(channelId, DraftType.ChannelMessage)
            && reply === PendingReplyStore.getPendingReply(channelId)?.message?.id
            && uploads === UploadAttachmentStore.getUploads(channelId, DraftType.ChannelMessage).map(upload => upload.id).join(",")
            && (!options.uploads?.length || options.uploads.every(upload => UploadAttachmentStore.getUploads(channelId, DraftType.ChannelMessage).some(current => current.id === upload.id))));
        pending = hold;
        countdown = setInterval(refresh, 1000);
        refresh();
        try { return { cancel: !await hold.promise }; }
        finally { if (pending === hold) { pending = undefined; clearInterval(countdown); countdown = undefined; } refresh(); }
    }
});
