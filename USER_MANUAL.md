# User Manual

This guide explains how to use the bot's core features.

## 1. Ticket System

The Ticket System allows users to open private support channels.

### For Admins
-   **Setup**: Run `/ticket config support_role:@Role` to assign the support team.
-   **Deploy**: Run `/ticket panel` in your support channel to post the interactive buttons.
-   **Management**: You can see and manage all private ticket channels.

### For Users
-   Click **Order Support** or **Report Issue** on the panel.
-   A private channel will open for you and the staff.
-   Click **Close** to archive the ticket when done.

## 2. Temporary Voice Channels

Users can create their own voice channels that delete themselves when empty.

1.  **Join the Generator**: Join the voice channel named "Join to Create" (must be set up via `/setup`).
2.  **Control Panel**: A text message with buttons will appear in the chat.
3.  **Controls**:
    -   **Lock/Unlock**: Stop others from joining.
    -   **Bitrate**: Change audio quality.
    -   **Limit**: Set user limit.
    -   **Kick/Ban**: Remove users from *your* channel.

## 3. Moderation Commands

Standard slash commands for server management.

-   `/kick [user]`: Remove a user.
-   `/ban [user]`: Ban a user.
-   `/warn [user]`: Log a warning.
-   `/timeout [user] [minutes]`: Mute a user.
-   `/undo [case_id]`: Revert a punishment.

## 4. Administration Config

-   `/addrole [user] [role]`: Manually assign a role to a user.
-   `/setup`: Run the interactive setup wizard (Roles, Logging, Features).
-   `/channel audit`: Scan for dangerous channel permissions.
-   `/autorole`: Setup automatic roles for new members or based on activity.

## 5. Auto-Welcome

Automatically greet new members with a customizable embed.

1.  **Enable**: Run `/setup` and select "Auto-Welcome".
2.  **Customize**:
    -   **Text**: Edit the title and description. You can use `{user}` (mentions the user) and `{server}` (server name).
    -   **Appearance**: Toggle user mention, thumbnail, or set a custom banner image.
3.  **Auto-Delete**: Optionally set the welcome message to delete itself after a few seconds (great for keeping chat clean).
