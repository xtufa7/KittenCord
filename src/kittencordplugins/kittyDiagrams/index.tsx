/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { CompactNotice, KcButton } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { React, useEffect, useRef, useState } from "@webpack/common";

import { chartPoints, chartY, diagramBlocks } from "./parse";
import { renderDiagram } from "./render";
import style from "./style.css?managed";

let active = false, epoch = 0;
let rendering = Promise.resolve();
function Chart({ source }: { source: string; }) {
    const { points, type } = chartPoints(source), values = points.map(point => point.value), zero = chartY(0, values);
    const x = (index: number) => 20 + (index + 0.5) / points.length * 560;
    return <svg role="img" aria-label={`${type} chart`} viewBox="0 0 600 220"><title>{points.map(point => `${point.label}: ${point.value}`).join(", ")}</title><line x1="20" y1={zero} x2="580" y2={zero}/>{type === "line" && <polyline fill="none" points={points.map((point, index) => `${x(index)},${chartY(point.value, values)}`).join(" ")}/>} {points.map((point, index) => <g key={index}>{type === "bar" ? <rect x={x(index) - 200 / points.length} y={Math.min(zero, chartY(point.value, values))} width={400 / points.length} height={Math.max(1, Math.abs(zero - chartY(point.value, values)))}/> : <circle cx={x(index)} cy={chartY(point.value, values)} r="3"/>}<title>{point.label}: {point.value}</title>{points.length <= 12 && <text x={x(index)} y="206" textAnchor="middle">{point.label.slice(0, 12)}</text>}</g>)}</svg>;
}
const Diagram = ErrorBoundary.wrap(function Diagram({ language, source }: { language: string; source: string; }) {
    const [image, setImage] = useState(""), [visible, setVisible] = useState(false), [error, setError] = useState(""), [busy, setBusy] = useState(false);
    const lifetime = useRef(0);
    useEffect(() => { lifetime.current++; return () => { lifetime.current++; }; }, [source]);
    useEffect(() => () => { if (image) URL.revokeObjectURL(image); }, [image]);
    useEffect(() => { setVisible(false); setImage(""); setError(""); }, [source]);
    return <section className="kc-premium-settings vc-kitty-diagrams"><KcButton disabled={busy} onClick={() => {
        if (visible) { setVisible(false); return; }
        if (language === "chart") { try { chartPoints(source); setVisible(true); setError(""); } catch (failure) { setError(failure instanceof Error ? failure.message : "Chart is invalid."); } return; }
        if (image) { setVisible(true); return; }
        setBusy(true); const current = epoch, instance = lifetime.current;
        rendering = rendering.then(async () => {
            if (!active || epoch !== current || instance !== lifetime.current) return;
            const url = await renderDiagram(source);
            if (active && epoch === current && instance === lifetime.current) { setImage(url); setVisible(true); setError(""); } else URL.revokeObjectURL(url);
        }).catch(failure => { if (active && epoch === current && instance === lifetime.current) setError(failure instanceof Error ? failure.message : "Diagram could not be rendered."); }).finally(() => { if (instance === lifetime.current) setBusy(false); });
    }}>{visible ? "Hide preview" : "Render preview"}</KcButton>{visible && (language === "chart" ? <Chart source={source}/> : <img src={image} alt="Rendered Mermaid diagram"/>)}{error && <CompactNotice tone="warning">{error}</CompactNotice>}</section>;
}, { noop: true });
export default definePlugin({
    name: "KittyDiagrams", description: "Preview Mermaid and CSV/JSON chart blocks locally on demand. Strict Mermaid mode, size limits, and no external diagram resources.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Chat", "Utility"], dependencies: ["MessageAccessoriesAPI"], managedStyle: style,
    renderMessageAccessory: props => <>{diagramBlocks((props.message as Message).content ?? "").map((block, index) => <Diagram key={`${index}:${block.source}`} {...block}/>)}</>,
    start() { active = true; epoch++; }, stop() { active = false; epoch++; }
});
