/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { compileStyle, requireStyle } from "@api/Styles";
import { CompactNotice } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { React } from "@webpack/common";

import { accentHex } from "./accent";
import style from "./style.css?managed";

let active = false, generation = 0, timer: ReturnType<typeof setInterval> | undefined, last = "";
async function sync() {
    const current = generation;
    if (!navigator.platform.startsWith("Win")) return;
    try {
        const values = await VencordNative.themes.getSystemValues(), color = accentHex(values["os-accent-color"] ?? "");
        if (!active || current !== generation || !color || color === last) return;
        last = color; const managed = requireStyle(style); managed.source = `.kc-premium-settings { --kc-brand: ${color}; }`; compileStyle(managed);
    } catch { last = ""; }
}
export default definePlugin({ name: "KittyAccentSync", description: "Use the Windows accent for KittenCord-owned interface accents only. Discord's theme and global brand colors stay untouched.", authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Appearance"], managedStyle: style, settingsAboutComponent: () => <CompactNotice>Windows only. Changes the KittenCord accent token and checks for OS accent changes every 30 seconds.</CompactNotice>, start() { active = true; generation++; void sync(); timer = setInterval(() => { void sync(); }, 30000); }, stop() { active = false; generation++; clearInterval(timer); timer = undefined; last = ""; const managed = requireStyle(style); managed.source = ""; compileStyle(managed); } });
