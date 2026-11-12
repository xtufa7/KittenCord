/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { CompactNotice, KcButton } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { closePluginPanels, openPluginPanel } from "@utils/kittyPluginPanel";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, React, SelectedChannelStore, TextInput, UploadHandler, useEffect, useRef, UserStore, useState } from "@webpack/common";

import { kitchenUrl } from "./pairs";

const controllers = new Set<AbortController>();
function abort() { for (const controller of controllers) controller.abort(); controllers.clear(); }
const settings = definePluginSettings({ online: { type: OptionType.BOOLEAN, default: false, description: "Download selected Emoji Kitchen images from www.gstatic.com. Only the two selected emoji are requested.", onChange(value) { if (!value) abort(); } } });
let active = false;
function show() {
    const channel = SelectedChannelStore.getChannelId(), account = UserStore.getCurrentUser()?.id;
    openPluginPanel("KittyEmojiKitchen", "Emoji Kitchen", function Kitchen() {
        const [left, setLeft] = useState("😃"), [right, setRight] = useState("🔥"), [image, setImage] = useState(""), [file, setFile] = useState<File>(), [busy, setBusy] = useState(false), [error, setError] = useState("");
        const alive = useRef(true), url = useRef("");
        useEffect(() => { alive.current = true; return () => { alive.current = false; if (url.current) URL.revokeObjectURL(url.current); }; }, []);
        return <><CompactNotice>Google's unofficial 2020 combination set. Some pairs are unavailable. Artwork by the Emoji Kitchen team. Nothing is sent until you use Discord's Send action.</CompactNotice><TextInput value={left} onChange={setLeft} placeholder="First emoji"/><TextInput value={right} onChange={setRight} placeholder="Second emoji"/><KcButton disabled={busy || !settings.store.online} onClick={async () => {
            const controller = new AbortController(); controllers.add(controller); const timer = setTimeout(() => controller.abort(), 15000); setBusy(true); setError(""); setFile(undefined); setImage("");
            try {
                const response = await fetch(kitchenUrl(left, right), { signal: controller.signal, credentials: "omit", redirect: "error", referrerPolicy: "no-referrer" });
                if (response.status === 404) throw new Error("This pair is not available in the supported set. Try reversing the emoji.");
                if (!response.ok || !response.headers.get("content-type")?.startsWith("image/png")) throw new Error("The image provider did not return a PNG.");
                const reader = response.body?.getReader(); if (!reader) throw new Error("The image could not be read."); const chunks: Uint8Array<ArrayBuffer>[] = []; let size = 0;
                try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 1000000) { await reader.cancel(); throw new Error("This image exceeds the 1 MB limit."); } chunks.push(value); } } finally { reader.releaseLock(); }
                if (!active || !alive.current || !settings.store.online) return;
                if (url.current) URL.revokeObjectURL(url.current); const next = new File(chunks, "emoji-kitchen.png", { type: "image/png" }); url.current = URL.createObjectURL(next); setFile(next); setImage(url.current);
            } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : "The combination could not be loaded."); }
            finally { controllers.delete(controller); clearTimeout(timer); if (alive.current) setBusy(false); }
        }}>Combine</KcButton>{image && <img src={image} width={256} height={256} alt="Combined emoji"/>}{file && <KcButton onClick={() => { if (active && account === UserStore.getCurrentUser()?.id && channel === SelectedChannelStore.getChannelId()) { const target = ChannelStore.getChannel(channel); if (target) UploadHandler.promptToUpload([file], target, 0); } else setError("Your account or channel changed. Open Emoji Kitchen again."); }}>Add to attachments</KcButton>}{error && <CompactNotice tone="warning">{error}</CompactNotice>}</>;
    });
}
export default definePlugin({ name: "KittyEmojiKitchen", description: "Combine supported emoji using Google's unofficial www.gstatic.com image set, with an optional download and explicit attachment review.", authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Media", "Utility"], settings, settingsAboutComponent: () => <KcButton onClick={show}>Open Emoji Kitchen</KcButton>, toolboxActions: { "Emoji Kitchen": show }, start() { active = true; }, stop() { active = false; abort(); closePluginPanels("KittyEmojiKitchen"); }, flux: { LOGOUT() { abort(); closePluginPanels("KittyEmojiKitchen"); } } });
