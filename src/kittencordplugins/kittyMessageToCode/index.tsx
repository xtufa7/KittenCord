/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CompactNotice, KcButton } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import { closePluginPanels, openPluginPanel } from "@utils/kittyPluginPanel";
import definePlugin from "@utils/types";
import { saveFile } from "@utils/web";
import type { Message } from "@vencord/discord-types";
import { Menu, React, TextArea, useState } from "@webpack/common";

import { messageCode } from "./convert";

function show(message: Message) { openPluginPanel("KittyMessageToCode", "Message to code", function Export() {
    const [target, setTarget] = useState<"json" | "js" | "py">("json");
    let code = "", error = ""; try { code = messageCode(message, target); } catch (failure) { error = failure instanceof Error ? failure.message : "This message cannot be exported."; }
    return <><CompactNotice>Produces source only. It never runs or sends anything. Mentions are disabled in generated payloads. Attachments are not downloaded; computed embed fields are omitted. Buttons with custom IDs require your own interaction handlers.</CompactNotice>{(["json", "js", "py"] as const).map(value => <KcButton key={value} onClick={() => setTarget(value)}>{value === "json" ? "Webhook JSON" : value === "js" ? "discord.js" : "discord.py"}</KcButton>)}{error ? <CompactNotice tone="warning">{error}</CompactNotice> : <><TextArea value={code} readOnly onChange={() => { }}/><KcButton onClick={() => { void copyWithToast(code); }}>Copy source</KcButton><KcButton onClick={() => saveFile(new File([code], `message.${target}`, { type: "text/plain" }))}>Save file</KcButton></>}</>;
}); }
export default definePlugin({ name: "KittyMessageToCode", description: "Export selected message content, embeds and supported components as escaped webhook JSON or discord.js/discord.py source. Nothing executes or sends automatically.", authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Utility", "Chat"], contextMenus: { message(children, { message }: { message: Message; }) { children.push(<Menu.MenuItem key="kitty-message-code" id="kitty-message-code" label="Export message as code" action={() => show(message)}/>); } }, stop() { closePluginPanels("KittyMessageToCode"); }, flux: { LOGOUT() { closePluginPanels("KittyMessageToCode"); } } });
