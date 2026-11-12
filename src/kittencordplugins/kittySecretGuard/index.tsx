/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Paragraph } from "@components/Paragraph";
import { CompactNotice, KcButton, PrefGroup, PrefRow } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { closeModal, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";

import { channelIsAllowlisted, detectSecrets, type SecretFinding } from "./detectors";
import style from "./style.css?managed";

const settings = definePluginSettings({
    allowedChannels: {
        type: OptionType.STRING,
        description: "Skip checks in these channel IDs, separated by commas. Messages there will not be protected.",
        default: ""
    }
});

let active = false;
const pending = new Set<() => void>();

function review(findings: SecretFinding[]): Promise<boolean> {
    if (pending.size) return Promise.resolve(false);
    return new Promise(resolve => {
        let key: string | undefined;
        let settled = false;
        const finish = (allow: boolean) => {
            if (settled) return;
            settled = true;
            pending.delete(cancel);
            resolve(allow && active);
        };
        const cancel = () => {
            finish(false);
            if (key) closeModal(key);
        };
        pending.add(cancel);
        try {
            key = openModal(props => <ModalRoot {...props} className="kc-premium-settings kc-secret-guard">
                <ModalHeader><strong>Check before sending</strong></ModalHeader>
                <ModalContent>
                    <CompactNotice tone="warning">This message may contain private information.</CompactNotice>
                    <PrefGroup title="Detected in message text">
                        {findings.map(finding => <PrefRow key={finding.kind} label={finding.kind} description={`${finding.count} match${finding.count === 1 ? "" : "es"}`} detail={finding.masked} />)}
                    </PrefGroup>
                    <Paragraph>Checked on your device. Nothing was logged or uploaded. Attachments are not scanned, and detection can miss secrets.</Paragraph>
                </ModalContent>
                <ModalFooter>
                    <KcButton onClick={() => { finish(true); props.onClose(); }}>Send anyway</KcButton>
                    <KcButton level="primary" autoFocus onClick={props.onClose}>Edit</KcButton>
                </ModalFooter>
            </ModalRoot>, { onCloseCallback: () => finish(false) });
        } catch {
            finish(false);
        }
    });
}

export default definePlugin({
    name: "KittySecretGuard",
    description: "Warn before sending message text that resembles secrets, passwords, payment cards or IBANs. Checks stay local and nothing is logged.",
    authors: [Devs.Kittencord],
    kittencordOrigin: "original",
    tags: ["Utility", "Chat"],
    enabledByDefault: false,
    dependencies: ["MessageEventsAPI"],
    managedStyle: style,
    settings,
    settingsAboutComponent: () => <CompactNotice>Scans outgoing text only. Review attachments yourself. Allowlisted channels skip protection.</CompactNotice>,
    flux: { LOGOUT() { for (const cancel of [...pending]) cancel(); } },
    start() { active = true; },
    stop() {
        active = false;
        for (const cancel of [...pending]) cancel();
    },
    async onBeforeMessageSend(channelId, message) {
        if (!active || channelIsAllowlisted(channelId, settings.store.allowedChannels)) return;
        const original = message.content;
        const findings = detectSecrets(original);
        if (!findings.length) return;
        const allowed = await review(findings);
        return { cancel: !active || !allowed || message.content !== original };
    }
});
