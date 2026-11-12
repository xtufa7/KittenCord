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
import definePlugin, { OptionType } from "@utils/types";
import { chooseFile } from "@utils/web";
import { Menu, React, TextArea, useEffect, useRef, useState } from "@webpack/common";

import { ocrInput, workerSource } from "./worker";

const settings = definePluginSettings({
    downloads: { type: OptionType.BOOLEAN, default: false, description: "Allow OCR runtime and Arabic/English dictionary downloads from cdn.jsdelivr.net (up to about 40 MB on first use). Dictionaries are cached by Tesseract. Images never leave this device.", onChange(value) { if (!value) cancel(); } },
    attachments: { type: OptionType.BOOLEAN, default: false, description: "Allow manually selected images to be loaded from Discord CDN and Discord image proxies for local OCR. Images are never uploaded.", onChange(value) { if (!value) cancel(); } }
});
const controllers = new Set<AbortController>();
const workers = new Set<Worker>();
const cleanup = new Set<() => void>();
let active = false, epoch = 0;
function cancel() { epoch++; for (const controller of controllers) controller.abort(); controllers.clear(); for (const stop of [...cleanup]) stop(); for (const worker of workers) worker.terminate(); workers.clear(); }
function show(src?: string) {
    openPluginPanel("KittyOcr", "Copy text from an image", function Editor() {
        const [language, setLanguage] = useState("eng+ara"), [text, setText] = useState(""), [status, setStatus] = useState(""), [busy, setBusy] = useState(false);
        const owned = useRef<(() => void) | undefined>(undefined);
        const alive = useRef(true);
        useEffect(() => { alive.current = true; return () => { alive.current = false; owned.current?.(); }; }, []);
        const { downloads } = settings.use(["downloads"]);
        return <><CompactNotice>Choose an image. Recognition runs locally in a worker. Enable dictionary downloads in this plugin's settings before first use. No image is uploaded.</CompactNotice><KcButton disabled={busy} onClick={() => setLanguage(value => value === "eng+ara" ? "eng" : value === "eng" ? "ara" : "eng+ara")}>Language: {language}</KcButton><KcButton disabled={busy || !downloads} onClick={async () => {
            const current = epoch;
            try {
                if (src && !settings.store.attachments) throw new Error("Enable selected attachment downloads in OCR settings first.");
                const controller = new AbortController(); controllers.add(controller);
                let file: File | null | undefined;
                try { file = src ? await fetchDiscordImage(src, controller.signal) : await chooseFile("image/png,image/jpeg,image/webp"); } finally { controllers.delete(controller); }
                if (!file || !alive.current || !active || epoch !== current || !settings.store.downloads) return;
                ocrInput(file, language);
                const bitmap = await createImageBitmap(file);
                const pixels = bitmap.width * bitmap.height; bitmap.close();
                if (pixels > 12000000) throw new Error("Use an image under 12 megapixels.");
                const bytes = await file.arrayBuffer();
                if (!alive.current || !active || epoch !== current || !settings.store.downloads) return;
                const url = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
                let worker: Worker;
                try { worker = new Worker(url); } catch { URL.revokeObjectURL(url); throw new Error("The OCR worker could not start."); }
                workers.add(worker); setBusy(true); setStatus("Preparing OCR…");
                const stop = () => { clearTimeout(timeout); worker.terminate(); workers.delete(worker); cleanup.delete(stop); URL.revokeObjectURL(url); owned.current = undefined; if (alive.current) setBusy(false); };
                const timeout = setTimeout(() => { stop(); setStatus("OCR timed out. Try a smaller image."); }, 120000);
                owned.current = stop; cleanup.add(stop);
                worker.onmessage = event => {
                    const { data } = event;
                    if (!data || typeof data !== "object" || !active || current !== epoch) return;
                    if ("text" in data && typeof data.text === "string") { setText(data.text.slice(0, 200000)); setStatus("Recognition complete. Review the text before using it."); stop(); }
                    else if ("error" in data) { setStatus("Recognition failed. Check download access or choose another image."); stop(); }
                    else if ("progress" in data && typeof data.progress === "string") setStatus(data.progress.slice(0, 100));
                };
                worker.onerror = () => { setStatus("The OCR worker could not start. This client may block worker downloads."); stop(); };
                worker.postMessage({ image: bytes, language }, [bytes]);
            } catch (failure) { if (alive.current) { setStatus(failure instanceof Error ? failure.message : "Image could not be read."); setBusy(false); } }
        }}>{src ? "Recognize selected Discord image" : "Choose image and recognize"}</KcButton>{busy && <KcButton onClick={() => { owned.current?.(); setStatus("Cancelled."); }}>Cancel recognition</KcButton>}{status && <CompactNotice>{status}</CompactNotice>}<TextArea value={text} onChange={setText}/><KcButton disabled={!text} onClick={() => { void copyWithToast(text); }}>Copy recognized text</KcButton></>;
    });
}
export default definePlugin({
    name: "KittyOcr", description: "Copy Arabic and English text from saved images locally. Optional first-use runtime and dictionary downloads use cdn.jsdelivr.net; images are never uploaded.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Media", "Utility"], dependencies: ["ContextMenuAPI"], settings,
    settingsAboutComponent: () => <KcButton onClick={() => show()}>Open image OCR</KcButton>, toolboxActions: { "Image OCR": () => show() },
    contextMenus: { "image-context"(children, { src }: { src?: string; }) { children.push(<Menu.MenuItem key="kitty-ocr" id="kitty-ocr" label={src ? "Copy text from this image" : "Copy text from a saved image"} action={() => show(src)}/>); } },
    flux: { LOGOUT() { cancel(); closePluginPanels("KittyOcr"); } }, start() { active = true; epoch++; }, stop() { active = false; cancel(); closePluginPanels("KittyOcr"); }
});
