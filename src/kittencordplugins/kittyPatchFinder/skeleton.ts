/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function patchSkeleton(anchor: string) {
    if (anchor.length < 8 || anchor.length > 100 || /[\r\n]/.test(anchor)) throw new Error("Choose a stable source anchor between 8 and 100 characters.");
    const escaped = anchor.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    return `import definePlugin from "@utils/types";\nimport { Devs } from "@utils/constants";\n\nexport default definePlugin({\n    name: "KittyPatchDraft",\n    description: "Developer patch draft. Review the anchor and replace expression before enabling.",\n    authors: [Devs.Kittencord],\n    kittencordOrigin: "original",\n    enabledByDefault: false,\n    patches: [{ find: ${JSON.stringify(anchor)}, replacement: { match: /${escaped}/, replace: "$&" } }],\n});\n`;
}
