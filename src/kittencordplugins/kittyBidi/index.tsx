/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CompactNotice } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Parser, React } from "@webpack/common";

import { firstStrongDirection } from "./direction";
import style from "./style.css?managed";

const keys = ["parse", "parseTopic", "parseEmbedTitle", "parseEmbedTitleWithoutLinks", "parseInlineReply"] as const;
const originals = new Map<typeof keys[number], typeof Parser.parse>();
const wrappers = new Map<typeof keys[number], typeof Parser.parse>();
let active = false;
let generation = 0;

export default definePlugin({
    name: "KittyBidi", description: "Apply automatic local text direction to parsed messages and embeds, with isolated links, code and mentions. Message text is never rewritten or sent.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Chat", "Appearance"], managedStyle: style, requiresRestart: false,
    settingsAboutComponent: () => <CompactNotice>Arabic and English follow the first strong character. The composer integration requires the current Discord editor patch to match.</CompactNotice>,
    direction: () => active ? "auto" : undefined,
    patches: [{ find: '"data-slate-editor":!0', replacement: { match: /"data-slate-editor":!0/, replace: "$&,dir:$self.direction()" } }],
    start() {
        active = true;
        const current = ++generation;
        for (const key of keys) {
            const original = Parser[key];
            const wrapper: typeof Parser.parse = function (content, inline, state) {
                const result = original.call(Parser, content, inline, state);
                return active && current === generation ? [<span key="kitty-bidi" dir={firstStrongDirection(content)} className="vc-kitty-bidi">{result}</span>] : result;
            };
            originals.set(key, original); wrappers.set(key, wrapper); Parser[key] = wrapper;
        }
    },
    stop() {
        active = false;
        generation++;
        for (const [key, original] of originals) if (Parser[key] === wrappers.get(key)) Parser[key] = original;
        originals.clear(); wrappers.clear();
    }
});
