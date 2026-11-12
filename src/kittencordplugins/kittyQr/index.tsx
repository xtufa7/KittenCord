/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { CompactNotice, KcButton } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import { fetchDiscordImage } from "@utils/kittyImageInput";
import { closePluginPanels, openPluginPanel } from "@utils/kittyPluginPanel";
import { decodeQr } from "@utils/kittyQr";
import { qrWarning } from "@utils/kittyScam";
import definePlugin, { OptionType } from "@utils/types";
import { chooseFile, saveFile } from "@utils/web";
import type { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, React, TextInput, useEffect, useRef, useState } from "@webpack/common";
import { toDataURL } from "qrcode";

import style from "./style.css?managed";
import { qrText } from "./text";

let active = false, epoch = 0;
const controllers = new Set<AbortController>();
function cancel() { for (const controller of controllers) controller.abort(); controllers.clear(); epoch++; }
const settings = definePluginSettings({ attachments: { type: OptionType.BOOLEAN, default: false, description: "Allow scans to load a selected Discord-hosted image or Discord image proxy. Images are processed locally and never uploaded.", onChange(value) { if (!value) cancel(); } } });
function show(initial = "", src?: string) {
    openPluginPanel("KittyQr", "QR codes", function Editor() {
        const [text, setText] = useState(initial), [image, setImage] = useState(""), [decoded, setDecoded] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
        const alive = useRef(true);
        useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
        return <div className="vc-kitty-qr"><TextInput value={text} onChange={setText} placeholder="Text or URL"/><KcButton disabled={busy} onClick={async () => {
            const current = epoch; setBusy(true);
            try { const data = await toDataURL(qrText(text), { errorCorrectionLevel: "M", width: 512, margin: 4 }); if (active && alive.current && current === epoch) { setImage(data); setError(""); } }
            catch (failure) { if (active && alive.current) setError(failure instanceof Error ? failure.message : "QR generation failed."); }
            finally { if (alive.current) setBusy(false); }
        }}>Generate</KcButton>{image && <><img width={256} height={256} src={image} alt="Generated QR code"/><KcButton onClick={async () => {
            try { const bytes = Uint8Array.from(atob(image.split(",")[1]), char => char.charCodeAt(0)); await navigator.clipboard.write([new ClipboardItem({ "image/png": new Blob([bytes], { type: "image/png" }) })]); setError("Image copied."); }
            catch { setError("Clipboard image access is unavailable. Download the PNG instead."); }
        }}>Copy image</KcButton><KcButton onClick={() => { const bytes = Uint8Array.from(atob(image.split(",")[1]), char => char.charCodeAt(0)); saveFile(new File([bytes], "qr-code.png", { type: "image/png" })); }}>Download PNG</KcButton></>}
            <KcButton disabled={busy} onClick={async () => {
                const current = epoch; setBusy(true);
                const controller = new AbortController(); controllers.add(controller);
                try { if (src && !settings.store.attachments) throw new Error("Enable selected attachment downloads in QR settings first."); const file = src ? await fetchDiscordImage(src, controller.signal) : await chooseFile("image/png,image/jpeg,image/webp,image/gif"); if (file) { const result = await decodeQr(file); if (active && alive.current && current === epoch) { setDecoded(result); setError(result ? "" : "No readable QR code found."); } } }
                catch (failure) { if (active && alive.current) setError(failure instanceof Error ? failure.message : "QR scan failed."); }
                finally { controllers.delete(controller); if (alive.current) setBusy(false); }
            }}>{src ? "Scan selected Discord image" : "Scan saved image"}</KcButton>{decoded && <><CompactNotice tone="warning">{qrWarning(decoded) || "Decoded text is untrusted. Scanning never opens a link or approves a login."}</CompactNotice><pre>{decoded}</pre><KcButton onClick={() => { void copyWithToast(decoded); }}>Copy decoded text</KcButton></>}{error && <CompactNotice>{error}</CompactNotice>}</div>;
    });
}
export default definePlugin({
    name: "KittyQr", description: "Create and copy QR images for text or message links, and scan saved images locally. Decoded links are never opened automatically.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Media", "Utility"], dependencies: ["ContextMenuAPI"], managedStyle: style, settings,
    settingsAboutComponent: () => <KcButton onClick={() => show()}>Open QR tools</KcButton>, toolboxActions: { "QR tools": () => show() },
    contextMenus: { message(children, { message }: { message: Message; }) { children.push(<Menu.MenuItem key="kitty-qr" id="kitty-qr" label="Create message-link QR" action={() => show(`https://discord.com/channels/${ChannelStore.getChannel(message.channel_id)?.guild_id || "@me"}/${message.channel_id}/${message.id}`)}/>); }, "image-context"(children, { src }: { src?: string; }) { if (src) children.push(<Menu.MenuItem key="kitty-qr-scan" id="kitty-qr-scan" label="Scan image QR" action={() => show("", src)}/>); } },
    flux: { LOGOUT() { cancel(); closePluginPanels("KittyQr"); } }, start() { active = true; epoch++; }, stop() { active = false; cancel(); closePluginPanels("KittyQr"); }
});
