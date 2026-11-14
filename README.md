<div align="center">

<img src=".github/assets/logo.png" width="160" alt="KittenCord logo">

# KittenCord

**The cutest Discord client mod.**

About 800 plugins, a Theme Library, Plugin Studio and badges,<br>inside the Discord you already use.

[![Release](https://img.shields.io/github/v/release/xtufa7/KittenCord?include_prereleases&style=for-the-badge&color=b996ff&label=release)](https://github.com/xtufa7/KittenCord/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/xtufa7/KittenCord/total?style=for-the-badge&color=ff8fd8)](https://github.com/xtufa7/KittenCord/releases)
[![Discord](https://img.shields.io/badge/Discord-Join_us-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/7bZ5qKdDR)
[![License](https://img.shields.io/github/license/xtufa7/KittenCord?style=for-the-badge&color=9fb4ff)](LICENSE)

### [**⬇️ Download KittenCord at kittencord.pages.dev**](https://kittencord.pages.dev/#install)

<img src=".github/assets/settings-plugins.jpg" width="720" alt="The KittenCord Plugins page inside Discord settings">

</div>

## ✨ Features

- 🧩 **About 800 plugins** from Vencord, Equicord, TestCord and KittenCord, each with its original authors
- 🔎 **Plugin manager** with search, filters, a list or card view and the health of every plugin
- 🎨 **Theme Library and Snippet Library** built into the Themes page
- 🛠️ **Plugin Studio**: write a TypeScript plugin, build it and run it without leaving Discord
- 🏅 **KittenCord badges**, while your Vencord, Equicord and TestCord badges keep showing
- 🛟 **Safe Start**: if a plugin stops Discord from starting, only that plugin is turned off and you are told why
- 🪟 **See-through windows** that you can still move from the top bar
- 🐾 **KittenCord's own settings section** that follows your Discord theme

### KittenCord originals

36 plugins made for KittenCord, all off until you turn them on. A few of them:

| Plugin | What it does |
| --- | --- |
| **Secret Guard** | Warns before you send something that looks like a password, token, card number or IBAN |
| **Scam Radar** | Flags scam phrases, lookalike links and suspicious QR codes |
| **Undo Send** | Holds your message for a moment so you can take it back |
| **Arabizi** | Turns Franco-Arabic into Arabic letters, and back |
| **OCR** | Copies Arabic and English text out of images, on your computer |
| **Voice Log** | A recap of every call you join: who was there and how long they stayed |
| **Media Lab** | Crop, resize and convert images. Trim and compress videos |
| **Time Capsule** | Message reminders with scheduling and snooze |

See all of them on [kittencord.pages.dev](https://kittencord.pages.dev/#plugins).

## 📥 Installing

1. Download KittenCord from **[kittencord.pages.dev](https://kittencord.pages.dev/#install)**.
2. Run the setup, choose your Discord installation and click **Install / Repair**.
3. Open Discord settings. KittenCord has its own section in the sidebar.

To update, download the setup again and choose **Install / Repair**; your settings are kept. Setup is not code-signed yet, so Windows SmartScreen may warn you.

### 🗑️ Uninstalling

Run `KittencordSetup.exe` again and choose **Restore**. Your KittenCord settings are kept in case you come back.

## 🧑‍💻 Building from source

You need [Node.js](https://nodejs.org) 22 or newer and [pnpm](https://pnpm.io).

```sh
git clone https://github.com/xtufa7/KittenCord
cd KittenCord
pnpm install --frozen-lockfile
pnpm build        # desktop
pnpm inject       # install your build into Discord
```

Want to help? Read [CONTRIBUTING.md](CONTRIBUTING.md).

## 💜 Community

Questions, ideas and bug reports are welcome in the [Discord server](https://discord.gg/7bZ5qKdDR) or in [GitHub issues](https://github.com/xtufa7/KittenCord/issues).

## 🙏 Credits

KittenCord is built on [TestCord](https://github.com/TestcordDev/TestCord), [Equicord](https://github.com/Equicord/Equicord) and [Vencord](https://github.com/Vendicated/Vencord). Thank you to everyone who made them and their plugins.

## ⚖️ Disclaimer

Discord is a trademark of Discord Inc. and is mentioned only to describe what KittenCord works with. KittenCord is not affiliated with or endorsed by Discord Inc.

<details>
<summary>Using KittenCord violates Discord's terms of service</summary>

Client modifications are against Discord's Terms of Service.

However, Discord is pretty indifferent about them and there are no known cases of users getting banned for using client mods. So you should generally be fine if you don't use plugins that implement abusive behaviour.

Regardless, if your account is very important to you and it getting disabled would be a disaster for you, you should probably not use any client mods (not exclusive to KittenCord), just to be safe.

</details>

<div align="center">

Made with 💜 by [xtufa7](https://github.com/xtufa7) · Licensed under [GPL-3.0-or-later](LICENSE)

</div>
