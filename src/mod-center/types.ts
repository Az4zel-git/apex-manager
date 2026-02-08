export enum ModStatus {
    ACTIVE = 'ACTIVE',
    BUSY = 'BUSY',
    IDLE = 'IDLE',
    OFFLINE = 'OFFLINE',
}

export enum BurnoutLevel {
    LOW = 'LOW',     // < 30
    MEDIUM = 'MEDIUM', // 30-70
    HIGH = 'HIGH',    // > 70
}

export interface ModeratorStats {
    ticketsResolved: number;
    avgResponseTime: number; // in seconds
    reopenRate: number; // percentage 0-1
    activeTickets: number;
}

export interface ReputationScore {
    total: number; // 0-100
    consistency: number;
    reliability: number;
    sustainability: number;
    responsiveness: number;
}
