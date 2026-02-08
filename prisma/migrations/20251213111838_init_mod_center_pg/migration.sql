-- CreateTable
CREATE TABLE "Case" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TempVoiceChannel" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TempVoiceChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildConfig" (
    "guildId" TEXT NOT NULL,
    "modRoles" TEXT NOT NULL,
    "adminRoles" TEXT NOT NULL,
    "logChannelId" TEXT,
    "generatorChannelId" TEXT,

    CONSTRAINT "GuildConfig_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "MemberStats" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messagesTotal" INTEGER NOT NULL DEFAULT 0,
    "voiceMinutesTotal" INTEGER NOT NULL DEFAULT 0,
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "messagesWeekly" INTEGER NOT NULL DEFAULT 0,
    "voiceMinutesWeekly" INTEGER NOT NULL DEFAULT 0,
    "lastDailyMessage" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberStats_pkey" PRIMARY KEY ("guildId","userId")
);

-- CreateTable
CREATE TABLE "AutoRoleRule" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "AutoRoleRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AchievementConfig" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AchievementConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT,
    "ownerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "claimedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "transcriptUrl" TEXT,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketEvent" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketConfig" (
    "guildId" TEXT NOT NULL,
    "supportRoleId" TEXT NOT NULL,
    "logChannelId" TEXT,
    "categoryId" TEXT,
    "archiveCategoryId" TEXT,

    CONSTRAINT "TicketConfig_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "TicketPanel" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channelId" TEXT,
    "messageId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Support Tickets',
    "description" TEXT NOT NULL DEFAULT 'Need help? Click a button below to open a ticket.',
    "color" TEXT NOT NULL DEFAULT '#00FF00',
    "thumbnailUrl" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketPanel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketPanelButton" (
    "id" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "emoji" TEXT,
    "style" TEXT NOT NULL,
    "customId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TicketPanelButton_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModeratorProfile" (
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isJunior" BOOLEAN NOT NULL DEFAULT false,
    "optedOut" BOOLEAN NOT NULL DEFAULT false,
    "burnoutScore" INTEGER NOT NULL DEFAULT 0,
    "lastBreakStart" TIMESTAMP(3),

    CONSTRAINT "ModeratorProfile_pkey" PRIMARY KEY ("guildId","userId")
);

-- CreateTable
CREATE TABLE "ModeratorMetrics" (
    "id" SERIAL NOT NULL,
    "modId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticketsResolved" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" INTEGER NOT NULL DEFAULT 0,
    "reopenCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ModeratorMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAssignment" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "modId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "reason" TEXT,

    CONSTRAINT "TicketAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModAuditLog" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BurnoutEvent" (
    "id" SERIAL NOT NULL,
    "modId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BurnoutEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModSettings" (
    "guildId" TEXT NOT NULL,
    "fairnessWeights" TEXT,
    "burnoutThresholds" TEXT,

    CONSTRAINT "ModSettings_pkey" PRIMARY KEY ("guildId")
);

-- CreateIndex
CREATE UNIQUE INDEX "TempVoiceChannel_channelId_key" ON "TempVoiceChannel"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketPanel_guildId_name_key" ON "TicketPanel"("guildId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ModeratorMetrics_modId_guildId_date_key" ON "ModeratorMetrics"("modId", "guildId", "date");

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPanelButton" ADD CONSTRAINT "TicketPanelButton_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "TicketPanel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeratorMetrics" ADD CONSTRAINT "ModeratorMetrics_guildId_modId_fkey" FOREIGN KEY ("guildId", "modId") REFERENCES "ModeratorProfile"("guildId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignment" ADD CONSTRAINT "TicketAssignment_guildId_modId_fkey" FOREIGN KEY ("guildId", "modId") REFERENCES "ModeratorProfile"("guildId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
