export interface MessageRecord {
  id: string;
  companyId: string;
  roomId: string;
  threadId: string | null;
  authorId: string;
  body: string;
  pinned: boolean;
  status: "sent" | "edited" | "redacted";
  createdAt: string;
  updatedAt: string;
  redactedBy: string | null;
  redactionReason: string | null;
}

export interface RoomRecord {
  id: string;
  companyId: string;
  name: string;
  kind: string;
  retentionDays: number | null;
  announcement: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface RoomMembership {
  companyId: string;
  roomId: string;
  employeeId: string;
  role: "owner" | "moderator" | "member" | "observer";
  joinedAt: string;
}

export interface ConversationThread {
  id: string;
  companyId: string;
  roomId: string;
  title: string;
  createdBy: string;
  status: "open" | "closed" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface AttachmentRecord {
  id: string;
  companyId: string;
  messageId: string;
  filename: string;
  mediaType: string;
  sizeBytes: number;
  digest: string;
  artifactUri: string;
  createdBy: string;
  createdAt: string;
}

export interface MessagePage {
  items: MessageRecord[];
  nextCursor: string | null;
}
