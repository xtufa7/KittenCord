/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { KcButton } from "@components/settings/tabs/KittenUI";
import { closeModal, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import { React } from "@webpack/common";
import type { ComponentType } from "react";

const panels = new Map<string, Set<string>>();

export function openPluginPanel(owner: string, title: string, Content: ComponentType<{ close(): void; }>) {
    const Body = ErrorBoundary.wrap(Content, { noop: true });
    const owned = panels.get(owner) ?? new Set<string>();
    panels.set(owner, owned);
    const key = openModal(props => <ModalRoot {...props} className="kc-premium-settings kc-preference"><ModalHeader>{title}</ModalHeader><ModalContent><Body close={props.onClose}/></ModalContent><ModalFooter><KcButton onClick={props.onClose}>Close</KcButton></ModalFooter></ModalRoot>, { onCloseCallback() {
        owned.delete(key);
        if (!owned.size) panels.delete(owner);
    } });
    owned.add(key);
}

export function closePluginPanels(owner: string) {
    const owned = panels.get(owner);
    if (!owned) return;
    for (const key of [...owned]) closeModal(key);
    panels.delete(owner);
}
