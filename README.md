<div align="center">

# Apex Manager

### The Ultimate Open-Source Discord Community Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-14.14-green.svg)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

[Features](#features) • [Installation](#installation) • [Configuration](#configuration) • [Commands](#commands) • [Support](#support)

</div>

---

## ⚡ Overview

**Apex Manager** is a powerful, modular, and fully open-source Discord bot designed for communities that demand reliability and control. Built with **TypeScript** and **PostgreSQL**, it offers a comprehensive suite of tools for moderation, support, and engagement without the bloat.

Whether you're running a small gaming server or a large community, Apex Manager scales with you.

## ✨ Features

### 🛡️ Advanced Moderation
- **Complete Suite**: Kick, Ban, Mute (Timeout), Warn, and Purge commands.
- **Audit Logging**: Detailed logs for every moderation action.
- **Undo System**: Accidental ban? Revert actions instantly with `/undo`.
- **Mod Center**: Review staff performance and moderation history.

### 🎫 Professional Ticket System
- **Interactive Panels**: Create sleek, button-based ticket panels.
- **Private Channels**: Automatically creates secure channels for support.
- **Transcripts**: Generate HTML transcripts of closed tickets.
- **Multi-Category**: Support for different ticket types (General, Billing, Report).

### 📊 Live Server Statistics
- **Real-Time Counters**: Display member counts, voice activity, and more in channel names.
- **Customizable**: Configure which stats to show via the dashboard.
- **Performance Optimized**: updates efficiently to respect API limits.

### 🔊 Temporary Voice Channels
- **Join-to-Create**: Users can create their own voice channels instantly.
- **Self-Management**: Users can lock, limit, and kick users from their temp channels.
- **Auto-Cleanup**: Channels are automatically deleted when empty.

### 🤖 Automation & Engagement
- **Auto-Roles**: Assign roles on join, after a delay, or based on activity.
- **Auto-Welcome**: customizable welcome images and messages.
- **Reaction Roles**: (Planned) engaging way for users to self-assign roles.

## 🚀 Installation

### Prerequisites
- **Node.js** v18 or newer
- **PostgreSQL** database
- **Discord Bot Token** (with Privileged Intents enabled)

### Quick Start

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/Azazelx0/apex-manager.git
    cd apex-manager
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Copy the example config and fill in your details:
    ```bash
    cp .env.example .env
    ```
    *Edit `.env` with your `DISCORD_TOKEN`, `DATABASE_URL`, and other settings.*

4.  **Database Setup**
    Initialize the database schema:
    ```bash
    npx prisma generate
    npx prisma db push
    ```

5.  **Start the Bot**
    ```bash
    npm run build
    npm start
    ```
    *For development, use `npm run dev`.*

## ⚙️ Configuration

Apex Manager is designed to be configurable both via environment variables and in-Discord commands.

- **Global Config**: Edit `src/config/branding.ts` to change the bot's name, colors, and footer text to match your community.
- **Server Config**: Run `/setup` in your server to interactively configure features.

## 📚 Documentation

For detailed instructions, please refer to:
- [📖 Setup Guide](./SETUP_GUIDE.md) - Deep dive into installation and troubleshooting.
- [📖 User Manual](./USER_MANUAL.md) - specific command usage and feature details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Support

If you need help or have any questions, feel free to reach out:

- **Discord**: @azaze.1
- **GitHub Issues**: [Open an issue](https://github.com/Azazelx0/apex-manager/issues)

---

<div align="center">
  <sub>Built with ❤️ by Azazel</sub>
</div>
