/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { CompactNotice, KcButton, PrefRow } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { fetchDiscordImage } from "@utils/kittyImageInput";
import { closePluginPanels, openPluginPanel } from "@utils/kittyPluginPanel";
import definePlugin, { OptionType } from "@utils/types";
import { chooseFile } from "@utils/web";
import { Menu, React, showToast, Slider, useEffect, useRef, useState } from "@webpack/common";

import { comparisonFile, comparisonPosition } from "./compare";
import style from "./style.css?managed";

let active = false, epoch = 0;
let firstImage = "";
const controllers = new Set<AbortController>();
function cancel() { epoch++; firstImage = ""; for (const controller of controllers) controller.abort(); controllers.clear(); }
const settings = definePluginSettings({ attachments: { type: OptionType.BOOLEAN, default: false, description: "Allow loading two manually selected images from Discord CDN and Discord image proxies. Images are processed locally, never uploaded.", onChange(value) { if (!value) cancel(); } } });
function show(sources: string[] = []) {
    openPluginPanel("KittyImageCompare", "Compare images", function Editor() {
        const [images, setImages] = useState<{ url: string; name: string; }[]>([]), [position, setPosition] = useState(50), [zoom, setZoom] = useState(1), [side, setSide] = useState(false), [error, setError] = useState("");
        const urls = useRef(new Set<string>()), alive = useRef(true);
        useEffect(() => { alive.current = true; return () => { alive.current = false; for (const url of urls.current) URL.revokeObjectURL(url); urls.current.clear(); }; }, []);
        async function select(index: number) {
            const current = epoch;
            try {
                const controller = new AbortController(); controllers.add(controller); let file: File | null | undefined;
                try { if (sources[index] && !settings.store.attachments) throw new Error("Enable selected attachment downloads in Image Compare settings first."); file = sources[index] ? await fetchDiscordImage(sources[index], controller.signal) : await chooseFile("image/png,image/jpeg,image/webp"); } finally { controllers.delete(controller); }
                if (!file || !active || current !== epoch || !alive.current) return;
                comparisonFile(file);
                const bitmap = await createImageBitmap(file), area = bitmap.width * bitmap.height; bitmap.close();
                if (area > 20000000) throw new Error("Choose an image under 20 megapixels.");
                if (!active || current !== epoch || !alive.current) return;
                const url = URL.createObjectURL(file); urls.current.add(url);
                setImages(old => { if (old[index]) { URL.revokeObjectURL(old[index].url); urls.current.delete(old[index].url); } const next = [...old]; next[index] = { url, name: file.name }; return next; });
                setError("");
            } catch (failure) { setError(failure instanceof Error ? failure.message : "Image could not be opened."); }
        }
        return <div className="vc-kitty-image-compare"><CompactNotice>Compare two saved images without uploading them. Save Discord attachments first. Both previews share the same zoom.</CompactNotice><KcButton onClick={() => { void select(0); }}>First image</KcButton><KcButton disabled={!images[0]} onClick={() => { void select(1); }}>Compare with…</KcButton>{images[0] && images[1] && <><KcButton onClick={() => setSide(value => !value)}>{side ? "Before / after" : "Side by side"}</KcButton><div className="vc-kitty-image-compare-viewport" data-side={side}><div className="vc-kitty-image-compare-stage" style={{ transform: `scale(${zoom})` }}><img src={images[0].url} alt={`Before: ${images[0].name}`}/><img src={images[1].url} alt={`After: ${images[1].name}`} className="vc-kitty-image-compare-after" style={side ? undefined : { clipPath: `inset(0 0 0 ${comparisonPosition(position)}%)` }}/></div></div><PrefRow label={`Reveal: ${Math.round(position)}%`}><Slider aria-label="Before and after reveal" initialValue={position} minValue={0} maxValue={100} onValueChange={setPosition} stickToMarkers={false}/></PrefRow><PrefRow label={`Zoom: ${zoom.toFixed(1)}×`}><Slider aria-label="Synchronized zoom" initialValue={zoom} minValue={1} maxValue={4} onValueChange={setZoom} stickToMarkers={false}/></PrefRow></>}{error && <CompactNotice tone="warning">{error}</CompactNotice>}</div>;
    });
}
export default definePlugin({
    name: "KittyImageCompare", description: "Compare two saved images with a before/after slider, side-by-side view and synchronized zoom. Entirely local.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Media", "Utility"], dependencies: ["ContextMenuAPI"], managedStyle: style, settings,
    settingsAboutComponent: () => <KcButton onClick={() => show()}>Compare images</KcButton>, toolboxActions: { "Compare images": () => show() },
    contextMenus: { "image-context"(children, { src }: { src?: string; }) { children.push(<Menu.MenuItem key="kitty-compare" id="kitty-compare" label="Compare saved images…" action={() => show()}/>); if (src) { children.push(<Menu.MenuItem key="kitty-compare-first" id="kitty-compare-first" label="Use as first comparison image" action={() => { firstImage = src; showToast("First image selected. Right-click another image and choose Compare with first image."); }}/>); if (firstImage) children.push(<Menu.MenuItem key="kitty-compare-second" id="kitty-compare-second" label="Compare with first image" action={() => { const first = firstImage; firstImage = ""; show([first, src]); }}/>); } } },
    flux: { LOGOUT() { cancel(); closePluginPanels("KittyImageCompare"); } }, start() { active = true; epoch++; }, stop() { active = false; cancel(); closePluginPanels("KittyImageCompare"); }
});
