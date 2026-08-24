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
