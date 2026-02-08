export enum TicketStatus {
    OPEN = 'OPEN',
    CLAIMED = 'CLAIMED',
    CLOSED = 'CLOSED',
    ARCHIVED = 'ARCHIVED'
}

export enum TicketAction {
    CREATED = 'CREATED',
    CLAIMED = 'CLAIMED',
    TRANSFERRED = 'TRANSFERRED',
    CLOSED = 'CLOSED',
    REOPENED = 'REOPENED',
    DELETED = 'DELETED'
}

export const TicketColors = {
    OPEN: 0x5865F2, // Blurple
    CLAIMED: 0xFEE75C, // Yellow
    CLOSED: 0xED4245, // Red
    SUCCESS: 0x57F287 // Green
};
