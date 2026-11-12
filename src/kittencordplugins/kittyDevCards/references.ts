/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type Provider = "github" | "npm" | "pypi" | "nvd";
export interface DevReference { provider: Provider; id: string; kind?: "issues" | "pull"; }
export function devReferences(text: string): DevReference[] {
    const refs: DevReference[] = [];
    for (const match of text.matchAll(/https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/(issues|pull)\/(\d{1,9})\b/g)) refs.push({ provider: "github", id: `${match[1]}/${match[2]}/${match[4]}`, kind: match[3] as "issues" | "pull" });
    for (const match of text.matchAll(/https:\/\/(?:www\.)?npmjs\.com\/package\/((?:@[\w.-]+\/)?[\w.-]+)/g)) refs.push({ provider: "npm", id: match[1] });
    for (const match of text.matchAll(/https:\/\/pypi\.org\/project\/([\w.-]+)/g)) refs.push({ provider: "pypi", id: match[1] });
    for (const match of text.matchAll(/\bCVE-\d{4}-\d{4,10}\b/gi)) refs.push({ provider: "nvd", id: match[0].toUpperCase() });
    return refs.filter((ref, index) => refs.findIndex(other => other.provider === ref.provider && other.id === ref.id && other.kind === ref.kind) === index).slice(0, 4);
}
export function providerUrl(ref: DevReference) {
    if (ref.provider === "github") { const [owner, repo, number] = ref.id.split("/"); if (!/^[\w-]+\/[\w.-]+\/\d{1,9}$/.test(ref.id) || repo === "." || repo === "..") throw new Error("Invalid GitHub reference."); return `https://api.github.com/repos/${owner}/${repo}/${ref.kind === "pull" ? "pulls" : "issues"}/${number}`; }
    if (ref.provider === "npm") { if (!/^(?:@[\w.-]+\/)?[\w.-]+$/.test(ref.id)) throw new Error("Invalid npm package."); return `https://registry.npmjs.org/${encodeURIComponent(ref.id)}/latest`; }
    if (ref.provider === "pypi") { if (!/^[\w.-]+$/.test(ref.id)) throw new Error("Invalid PyPI project."); return `https://pypi.org/pypi/${encodeURIComponent(ref.id)}/json`; }
    if (!/^CVE-\d{4}-\d{4,10}$/.test(ref.id)) throw new Error("Invalid CVE identifier.");
    return `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(ref.id)}`;
}
