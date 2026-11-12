/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { CompactNotice, KcButton } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { fetchDiscordImage } from "@utils/kittyImageInput";
import definePlugin, { OptionType } from "@utils/types";
import { chooseFile } from "@utils/web";
import type { Message } from "@vencord/discord-types";
import { React, useEffect, useRef, useState } from "@webpack/common";

import { qrWarning, scamWarnings } from "./detectors";
import { decodeQr } from "./qr";
import style from "./style.css?managed";

const controllers = new Set<AbortController>();
function cancel() { for (const controller of controllers) controller.abort(); controllers.clear(); }
const settings = definePluginSettings({ attachments: { type: OptionType.BOOLEAN, default: false, description: "Allow manual QR scans to load selected images from cdn.discordapp.com, media.discordapp.net and Discord image proxies. Images are decoded locally, never uploaded.", onChange(value) { if (!value) cancel(); } } });
let active = false;

const Warning = ErrorBoundary.wrap(function Warning({ message }: { message: Message; }) {
    const warnings = scamWarnings(message.content ?? "");
    const [result, setResult] = useState(""), [busy, setBusy] = useState(false), alive = useRef(true);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    const { attachments } = settings.use(["attachments"]);
    const images = (message.attachments ?? []).filter(file => file.content_type?.startsWith("image/")).slice(0, 3);
    return warnings.length || attachments && images.length ? <div className="kc-premium-settings vc-kitty-scam-radar">{warnings.length > 0 && <CompactNotice tone="warning">{warnings.join(" · ")}. A warning is a heuristic, not proof of fraud.</CompactNotice>}{attachments && images.map(file => <KcButton key={file.id} disabled={busy} onClick={async () => {
        const controller = new AbortController(); controllers.add(controller); setBusy(true);
        try { const image = await fetchDiscordImage(file.url, controller.signal), text = await decodeQr(image); if (active && alive.current && settings.store.attachments) setResult(text ? qrWarning(text) || "QR decoded. No recognized login pattern; this does not establish safety." : "No readable QR found."); }
        catch (failure) { if (alive.current) setResult(failure instanceof Error ? failure.message : "The image could not be scanned."); }
        finally { controllers.delete(controller); if (alive.current) setBusy(false); }
    }}>Scan QR: {file.filename}</KcButton>)}{result && <CompactNotice tone="warning">{result}</CompactNotice>}</div> : null;
}, { noop: true });

const Scanner = ErrorBoundary.wrap(function Scanner() {
    const [result, setResult] = useState(""), [busy, setBusy] = useState(false), alive = useRef(true);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    return <div className="kc-premium-settings vc-kitty-scam-radar"><KcButton disabled={busy} onClick={async () => {
        setBusy(true);
        try {
            const file = await chooseFile("image/png,image/jpeg,image/webp,image/gif");
            if (file && active && alive.current) { const text = await decodeQr(file); if (active && alive.current) setResult(text ? qrWarning(text) || "QR decoded. No known Discord login pattern found. This does not establish safety." : "No readable QR code in this image."); }
        } catch (error) { if (active && alive.current) setResult(error instanceof Error ? error.message : "The image could not be scanned."); }
        finally { if (alive.current) setBusy(false); }
    }}>Scan a saved QR image</KcButton>{result && <CompactNotice tone="warning">{result}</CompactNotice>}</div>;
}, { noop: true });

export default definePlugin({
    name: "KittyScamRadar",
    description: "Flag scam phrases and lookalike links locally. Scan saved QR images or optionally load selected Discord image attachments for local QR checks.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false,
    tags: ["Utility", "Chat"], dependencies: ["MessageAccessoriesAPI"], managedStyle: style,
    settings, settingsAboutComponent: Scanner,
    renderMessageAccessory: props => <Warning message={props.message} />,
    start() { active = true; }, stop() { active = false; cancel(); }, flux: { LOGOUT: cancel }
});
