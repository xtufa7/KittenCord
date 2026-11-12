/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { validateMermaid } from "./parse";

export async function renderDiagram(source: string) {
    validateMermaid(source);
    const mermaid = (await import("mermaid")).default;
    const theme = getComputedStyle(document.querySelector("#app-mount") ?? document.body), color = (name: string) => theme.getPropertyValue(name).trim();
    if (!color("--text-normal") || !color("--background-secondary")) throw new Error("Discord theme colors are not available yet.");
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict", suppressErrorRendering: true, maxTextSize: 6000, maxEdges: 150, theme: "base", htmlLabels: false, flowchart: { htmlLabels: false }, themeVariables: { primaryColor: color("--background-secondary"), primaryTextColor: color("--text-normal"), primaryBorderColor: color("--text-muted"), lineColor: color("--text-muted"), secondaryColor: color("--background-tertiary"), tertiaryColor: color("--background-primary"), fontFamily: "inherit" } });
    const result = await mermaid.render(`kitty-diagram-${crypto.randomUUID()}`, source);
    return URL.createObjectURL(new Blob([result.svg], { type: "image/svg+xml" }));
}
