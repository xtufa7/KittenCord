/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { get, set } from "@api/DataStore";
import { CompactNotice, KcButton } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { closePluginPanels, openPluginPanel } from "@utils/kittyPluginPanel";
import definePlugin from "@utils/types";
import { chooseFile, saveFile } from "@utils/web";
import type { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, Parser, React, SelectedGuildStore, TextArea, Tooltip, UserStore, useState } from "@webpack/common";

import style from "./style.css?managed";
import { parseGlossary, termSegments } from "./terms";

let personal: Record<string, string> = {}, servers: Record<string, Record<string, string>> = {};
let account = "", active = false, epoch = 0, hookGeneration = 0;
let original: ((node: { content: string; }, ...args: unknown[]) => unknown) | undefined;
let wrapper: typeof original;
let writes = Promise.resolve();
function save() {
    const id = account, value = { personal, servers };
    if (id) writes = writes.then(() => set(`KittenCord:Glossary:${id}`, value)).catch(() => { if (account === id) account = ""; });
}
async function load() {
    const id = UserStore.getCurrentUser()?.id, current = ++epoch;
    account = ""; personal = {}; servers = {};
    if (!id) return;
    try {
        await writes;
        if (!active || current !== epoch) return;
        const data = await get<{ personal: Record<string, string>; servers: Record<string, Record<string, string>>; }>(`KittenCord:Glossary:${id}`);
        if (!active || current !== epoch) return;
        personal = parseGlossary(JSON.stringify(data?.personal ?? {}));
        servers = Object.fromEntries(Object.entries(data?.servers ?? {}).slice(0, 100).map(([guild, value]) => [guild, parseGlossary(JSON.stringify(value))]));
        account = id;
    } catch { account = ""; }
}
function show() {
    openPluginPanel("KittyGlossary", "Personal glossary", function Editor() {
        const [value, setValue] = useState(JSON.stringify(personal, null, 2)), [error, setError] = useState("");
        return <><CompactNotice>Definitions stay on this device. To use a pinned server glossary, right-click the pinned JSON message. No pinned messages are fetched automatically.</CompactNotice><TextArea value={value} onChange={setValue}/><KcButton disabled={!account} onClick={() => {
            try { if (!active || account !== UserStore.getCurrentUser()?.id) return; personal = parseGlossary(value); save(); setError("Saved. Newly rendered message text will use this glossary."); }
            catch (failure) { setError(failure instanceof Error ? failure.message : "Glossary could not be saved."); }
        }}>Save</KcButton><KcButton onClick={async () => {
            try { const file = await chooseFile("application/json,.json"); if (file) { if (file.size > 100000) throw new Error("Choose a JSON file under 100 KB."); const text = await file.text(); parseGlossary(text); setValue(text); } }
            catch (failure) { setError(failure instanceof Error ? failure.message : "Import failed."); }
        }}>Import</KcButton><KcButton onClick={() => saveFile(new File([JSON.stringify(personal, null, 2)], "glossary.json", { type: "application/json" }))}>Export saved glossary</KcButton>{error && <CompactNotice>{error}</CompactNotice>}</>;
    });
}
function clear() { epoch++; account = ""; personal = {}; servers = {}; closePluginPanels("KittyGlossary"); }
export default definePlugin({
    name: "KittyGlossary", description: "Underline personal glossary terms with local definitions. Import and export JSON or explicitly use a pinned JSON message as a server glossary.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Chat", "Utility"], dependencies: ["ContextMenuAPI"], managedStyle: style,
    settingsAboutComponent: () => <KcButton onClick={show}>Edit glossary</KcButton>, toolboxActions: { Glossary: show },
    contextMenus: { message(children, { message }: { message: Message; }) {
        const guild = ChannelStore.getChannel(message.channel_id)?.guild_id;
        if (guild && message.pinned) children.push(<Menu.MenuItem key="kitty-glossary" id="kitty-glossary" label="Use pinned JSON as server glossary" action={() => {
            openPluginPanel("KittyGlossary", "Review server glossary", function Review({ close }) {
                const [error, setError] = useState("");
                return <><pre>{message.content.slice(0, 100000)}</pre><KcButton onClick={() => {
                    try { if (!active || !account || account !== UserStore.getCurrentUser()?.id) return; const value = parseGlossary(message.content); servers = { ...servers, [guild]: value }; save(); close(); }
                    catch (failure) { setError(failure instanceof Error ? failure.message : "This message is not a valid glossary."); }
                }}>Use on this device</KcButton>{error && <CompactNotice tone="warning">{error}</CompactNotice>}</>;
            });
        }}/>);
    } },
    flux: { CONNECTION_OPEN() { void load(); }, LOGOUT: clear },
    start() {
        active = true; void load();
        original = Parser.defaultRules.text?.react;
        const render = original;
        if (typeof render !== "function") return;
        const current = ++hookGeneration;
        wrapper = function (node, ...args) {
            if (!active || hookGeneration !== current || typeof node.content !== "string") return render(node, ...args);
            const glossary = { ...servers[SelectedGuildStore.getGuildId() ?? ""], ...personal };
            return termSegments(node.content, glossary).map((segment, index) => segment.definition ? <Tooltip key={index} text={segment.definition}>{props => <span {...props} className="vc-kitty-glossary">{segment.text}</span>}</Tooltip> : segment.text);
        };
        Parser.defaultRules.text.react = wrapper;
    },
    stop() { active = false; hookGeneration++; if (original && Parser.defaultRules.text?.react === wrapper) Parser.defaultRules.text.react = original; original = undefined; wrapper = undefined; clear(); }
});
