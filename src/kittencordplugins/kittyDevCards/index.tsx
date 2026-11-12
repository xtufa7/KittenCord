/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { get, set } from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { CompactNotice, KcButton, PrefGroup, PrefRow } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React, Tooltip, useEffect, useRef, useState } from "@webpack/common";

import { type DevReference, devReferences, type Provider, providerUrl } from "./references";

const settings = definePluginSettings({
    github: { type: OptionType.BOOLEAN, default: false, description: "On click, load public issue/PR metadata and commit status from api.github.com. No credentials or surrounding message text are sent.", onChange(value) { if (!value) cancel(); } },
    npm: { type: OptionType.BOOLEAN, default: false, description: "On click, load npm metadata and weekly downloads from registry.npmjs.org and api.npmjs.org.", onChange(value) { if (!value) cancel(); } },
    pypi: { type: OptionType.BOOLEAN, default: false, description: "On click, load PyPI project metadata from pypi.org. Weekly download counts are not available from this API.", onChange(value) { if (!value) cancel(); } },
    nvd: { type: OptionType.BOOLEAN, default: false, description: "On click, load public CVE summaries and CVSS scores from services.nvd.nist.gov.", onChange(value) { if (!value) cancel(); } }
});
interface Card { title: string; summary: string; details: string; at: number; }
let active = false, generation = 0, nextRequest = 0;
let queue = Promise.resolve();
const requests = new Map<string, Promise<Card>>(), controllers = new Set<AbortController>(), waits = new Set<() => void>(), cooldown = new Map<string, number>();
function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown, limit = 500) { return typeof value === "string" ? value.slice(0, limit) : ""; }
function cancel() { generation++; for (const controller of controllers) controller.abort(); controllers.clear(); for (const finish of [...waits]) finish(); requests.clear(); }
async function json(url: string, current: number, provider: Provider): Promise<unknown> {
    const host = new URL(url).hostname;
    if (!["api.github.com", "registry.npmjs.org", "api.npmjs.org", "pypi.org", "services.nvd.nist.gov"].includes(host)) throw new Error("Unsupported provider host.");
    if (!active || generation !== current || !settings.store[provider]) throw new Error("Provider access was cancelled.");
    const delay = Math.max(0, nextRequest - Date.now());
    if (delay) await new Promise<void>(resolve => { const finish = () => { clearTimeout(timer); waits.delete(finish); resolve(); }, timer = setTimeout(finish, delay); waits.add(finish); });
    if (!active || generation !== current || !settings.store[provider]) throw new Error("Provider access was cancelled.");
    if ((cooldown.get(host) ?? 0) > Date.now()) throw new Error("This provider is rate limited. Try again later.");
    nextRequest = Date.now() + 6500;
    const controller = new AbortController(); controllers.add(controller); const timer = setTimeout(() => controller.abort(), 20000);
    try {
        const response = await fetch(url, { signal: controller.signal, credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", headers: { Accept: "application/json" } });
        if (response.status === 403 || response.status === 429) { const retry = response.headers.get("retry-after"), seconds = Number(retry), until = retry && !Number.isFinite(seconds) ? Date.parse(retry) : Date.now() + (seconds || 60) * 1000; cooldown.set(host, Math.min(Date.now() + 3600000, Math.max(Date.now() + 60000, until || 0))); throw new Error("This provider is rate limited. Try again later."); }
        if (!response.ok) throw new Error(response.status === 404 ? "Public metadata was not found." : "The provider could not return metadata.");
        const reader = response.body?.getReader(); if (!reader) throw new Error("The provider returned an empty response."); const decoder = new TextDecoder(); let result = "", size = 0;
        try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 2000000) { await reader.cancel(); throw new Error("Provider metadata exceeds the 2 MB limit."); } result += decoder.decode(value, { stream: true }); } } finally { reader.releaseLock(); }
        return JSON.parse(result + decoder.decode());
    } finally { clearTimeout(timer); controllers.delete(controller); }
}
async function fetchCard(ref: DevReference, current: number): Promise<Card> {
    const data = record(await json(providerUrl(ref), current, ref.provider)); let title = ref.id, summary = "", details = "";
    if (ref.provider === "github") {
        title = text(data.title); summary = `${text(data.state)}${data.merged === true ? " · merged" : ""}`;
        details = Array.isArray(data.labels) ? data.labels.map(value => text(record(value).name, 60)).filter(Boolean).join(", ") : "";
        const sha = text(record(data.head).sha);
        if (ref.kind === "pull" && /^[a-f\d]{40}$/.test(sha)) {
            const [owner, repo] = ref.id.split("/");
            try { const status = record(await json(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}/status`, current, ref.provider)); details += ` · Commit statuses: ${typeof status.total_count === "number" && status.total_count > 0 ? text(status.state) : "not reported"}. GitHub check runs are not included.`; }
            catch { details += " · Commit status unavailable."; }
        }
    } else if (ref.provider === "npm") {
        title = text(data.name) || ref.id; summary = `${text(data.version)} · ${text(data.description)}`;
        try { const downloads = record(await json(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(ref.id)}`, current, ref.provider)); details = typeof downloads.downloads === "number" ? `${downloads.downloads.toLocaleString()} downloads · ${text(downloads.start)} to ${text(downloads.end)}` : "Weekly downloads unavailable."; }
        catch { details = "Weekly downloads unavailable."; }
    } else if (ref.provider === "pypi") { const info = record(data.info); title = text(info.name) || ref.id; summary = `${text(info.version)} · ${text(info.summary)}`; details = "PyPI's JSON API does not provide weekly downloads."; }
    else {
        const cve = record(record(Array.isArray(data.vulnerabilities) ? data.vulnerabilities[0] : undefined).cve);
        if (!cve.id) throw new Error("This CVE has no public NVD record.");
        title = text(cve.id); summary = Array.isArray(cve.descriptions) ? text(record(cve.descriptions.find(value => record(value).lang === "en")).value, 1200) : "No English summary available.";
        const metrics = record(cve.metrics); let score: number | undefined;
        for (const key of ["cvssMetricV40", "cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]) { const rows = metrics[key]; if (Array.isArray(rows)) { const value = record(record(rows[0]).cvssData).baseScore; if (typeof value === "number" && Number.isFinite(value)) { score = value; break; } } }
        details = score === undefined ? "CVSS score not published." : `CVSS base score ${score}/10`;
    }
    return { title: title.slice(0, 300), summary: summary.slice(0, 1500), details: details.slice(0, 1000), at: Date.now() };
}
async function load(ref: DevReference) {
    if (!active || !settings.store[ref.provider]) throw new Error("Enable this provider in Kitty DevCards settings first.");
    const key = `${ref.provider}:${ref.kind ?? ""}:${ref.id}`, current = generation, existing = requests.get(key); if (existing) return existing;
    const task = (async () => {
        const cached = await get<Card>(`KittenCord:DevCards:${key}`).catch(() => undefined);
        if (!active || current !== generation) throw new Error("Provider access was cancelled.");
        if (cached && typeof cached.title === "string" && typeof cached.summary === "string" && typeof cached.details === "string" && typeof cached.at === "number" && cached.at <= Date.now() && Date.now() - cached.at < 86400000) return cached;
        let result: Card | undefined; const work = queue.then(async () => { result = await fetchCard(ref, current); }); queue = work.catch(() => {}); await work;
        if (!result || !active || current !== generation || !settings.store[ref.provider]) throw new Error("Provider access was cancelled.");
        await set(`KittenCord:DevCards:${key}`, result).catch(() => {}); return result;
    })(); requests.set(key, task); try { return await task; } finally { if (requests.get(key) === task) requests.delete(key); }
}
const Reference = ErrorBoundary.wrap(function Reference({ reference }: { reference: DevReference; }) {
    const [card, setCard] = useState<Card>(), [error, setError] = useState(""), [busy, setBusy] = useState(false), alive = useRef(true);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    return <div className="kc-premium-settings"><Tooltip text={card ? `${card.title}\n${card.summary}\n${card.details}` : "Load public metadata on demand"}>{props => <span {...props}><KcButton disabled={busy} onClick={async () => { setBusy(true); const current = generation; try { const value = await load(reference); if (alive.current && active && current === generation) { setCard(value); setError(""); } } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : "Metadata unavailable."); } finally { if (alive.current) setBusy(false); } }}>{busy ? "Loading metadata…" : `${reference.provider}: ${reference.id}`}</KcButton></span>}</Tooltip>{card && <PrefGroup><PrefRow label={card.title} description={card.summary} detail={new Date(card.at).toLocaleDateString()}/><PrefRow label={card.details}/></PrefGroup>}{error && <CompactNotice>{error}</CompactNotice>}</div>;
}, { noop: true });
export default definePlugin({ name: "KittyDevCards", description: "Load GitHub, npm, PyPI and NVD reference cards on click. Each provider is opt-in, rate limited and cached for 24 hours; surrounding message text is never uploaded.", authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Chat", "Utility"], settings, renderMessageAccessory: ({ message }) => <ErrorBoundary noop>{devReferences(message.content).map(reference => <Reference key={`${reference.provider}:${reference.kind}:${reference.id}`} reference={reference}/>)}</ErrorBoundary>, start() { active = true; generation++; }, stop() { active = false; cancel(); }, flux: { LOGOUT: cancel } });
