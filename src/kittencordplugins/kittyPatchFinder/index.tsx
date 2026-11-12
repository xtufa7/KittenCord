/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CompactNotice, KcButton } from "@components/settings/tabs/KittenUI";
import { openNativeProject } from "@components/settings/tabs/kittycordWorkshop/NativeStudio";
import { settings } from "@plugins/_core/settings";
import { newNativeProject } from "@shared/kittycord/nativeStudio";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import { closePluginPanels, openPluginPanel } from "@utils/kittyPluginPanel";
import definePlugin from "@utils/types";
import { cache } from "@webpack";
import { React, showToast, TextArea, TextInput, useState } from "@webpack/common";

import { patchSkeleton } from "./skeleton";

let active = false, picking = false, timer: ReturnType<typeof setTimeout> | undefined;
function cancel() { picking = false; clearTimeout(timer); document.removeEventListener("click", pick, true); document.removeEventListener("keydown", escape, true); }
function escape(event: KeyboardEvent) { if (event.key === "Escape") cancel(); }
function inspect(target: Element) {
    const key = Object.getOwnPropertyNames(target).find(key => key.startsWith("__reactFiber$"));
    let node: unknown = key ? Reflect.get(target, key) : undefined;
    const owners: { component: (props: unknown) => unknown; name: string; }[] = [];
    for (let depth = 0; node && typeof node === "object" && depth < 40; depth++) {
        const type: unknown = Reflect.get(node, "type");
        if (typeof type === "function") owners.push({ component: type as (props: unknown) => unknown, name: String(Reflect.get(type, "displayName") || type.name || "Anonymous component") });
        node = Reflect.get(node, "return");
    }
    let found: { id: string; name: string; source: string; } | undefined;
    for (const owner of owners) {
        for (const [id, module] of Object.entries(cache)) {
            const value: unknown = module?.exports;
            if (value === owner.component || value && typeof value === "object" && Object.values(Object.getOwnPropertyDescriptors(value)).some(descriptor => descriptor.value === owner.component)) { found = { id, name: owner.name, source: owner.component.toString().slice(0, 30000) }; break; }
        }
        if (found) break;
    }
    openPluginPanel("KittyPatchFinder", "Picked component", function Review({ close }) {
        const [anchor, setAnchor] = useState(""), [error, setError] = useState("");
        let source = ""; try { if (anchor) source = patchSkeleton(anchor); } catch {}
        return <><CompactNotice>{found ? `${found.name} · loaded module ${found.id}` : "No directly exported owner was found. Components held in closures, memo wrappers and unloaded modules may not be attributable."} No modules were executed. A generated draft is a no-op until you write the replacement. Prefer stable internationalization keys over hashed CSS classes.</CompactNotice>{found && <TextArea value={found.source} readOnly onChange={() => { }}/>}<TextInput value={anchor} onChange={setAnchor} placeholder="Stable literal visible in the component source"/>{source && <TextArea value={source} readOnly onChange={() => { }}/>}<KcButton disabled={!source} onClick={() => { void copyWithToast(source); }}>Copy skeleton</KcButton><KcButton disabled={!source} onClick={() => {
            if (!active || !settings.store.developerMode) return;
            try { if (!found?.source.includes(anchor)) throw new Error("Choose an anchor present in the picked component source."); const project = newNativeProject("patch"); project.metadata = { ...project.metadata, id: `local.kitten.patch.${crypto.randomUUID()}`, name: "KittyPatchDraft" }; project.files = { "index.tsx": patchSkeleton(anchor) }; close(); openNativeProject(project); }
            catch (failure) { setError(failure instanceof Error ? failure.message : "Studio could not be opened."); }
        }}>Open draft in Studio</KcButton>{error && <CompactNotice tone="warning">{error}</CompactNotice>}</>;
    });
}
function pick(event: MouseEvent) { if (!picking || !active || !settings.store.developerMode || !(event.target instanceof Element)) { cancel(); return; } event.preventDefault(); event.stopImmediatePropagation(); const { target } = event; cancel(); inspect(target); }
function startPick() { if (!active || !settings.store.developerMode) { showToast("Enable KittenCord Developer Tools first."); return; } cancel(); picking = true; document.addEventListener("click", pick, true); document.addEventListener("keydown", escape, true); timer = setTimeout(cancel, 30000); showToast("Click an interface element to inspect it. Escape cancels."); }
export default definePlugin({ name: "KittyPatchFinder", description: "Developer-only element picker for loaded React owners, with reviewed no-op patch drafts that open in the existing Studio. Never executes modules or proposed patches.", authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Utility"], settingsAboutComponent: () => <KcButton disabled={!settings.store.developerMode} onClick={startPick}>Pick an interface element</KcButton>, toolboxActions: { "Pick component for Studio": startPick }, start() { active = true; }, stop() { active = false; cancel(); closePluginPanels("KittyPatchFinder"); }, flux: { LOGOUT() { cancel(); closePluginPanels("KittyPatchFinder"); } } });
