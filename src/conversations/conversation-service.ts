import type { AuditRepository } from "../storage/audit-repository.js";
import type { CompanyRepository } from "../storage/company-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { AttachmentRepository, type CreateAttachmentInput } from "./attachment-repository.js";
import type {
  AttachmentRecord,
  ConversationThread,
  MessagePage,
  MessageRecord,
  RoomMembership,
  RoomRecord,
} from "./conversation-types.js";
import { MessageRepository } from "./message-repository.js";
import { RoomRepository } from "./room-repository.js";
import { ThreadRepository } from "./thread-repository.js";

export class ConversationService {
  readonly rooms: RoomRepository;
  readonly threads: ThreadRepository;
  readonly messages: MessageRepository;
  readonly attachments: AttachmentRepository;

  constructor(database: WorkforceDatabase, companies: CompanyRepository, audit: AuditRepository) {
    this.rooms = new RoomRepository(database, companies, audit);
    this.threads = new ThreadRepository(database, audit);
    this.messages = new MessageRepository(database, this.threads, audit);
    this.attachments = new AttachmentRepository(database, audit);
  }

  addMessage(
    companyId: string,
    roomId: string,
    authorId: string,
    body: string,
    threadId: string | null = null,
  ): MessageRecord {
    return this.messages.create(companyId, roomId, authorId, body, threadId);
  }

  messagePage(
    companyId: string,
    roomId: string,
    query = "",
    limit = 50,
    before?: string,
  ): MessagePage {
    return this.messages.search(companyId, roomId, query, limit, before);
  }

  createThread(
    companyId: string,
    roomId: string,
    title: string,
    actorId: string,
  ): ConversationThread {
    return this.threads.create(companyId, roomId, title, actorId);
  }

  addRoomMember(
    companyId: string,
    roomId: string,
    employeeId: string,
    role: RoomMembership["role"],
    actorId: string,
  ): RoomMembership {
    return this.rooms.addMember(companyId, roomId, employeeId, role, actorId);
  }

  createAttachment(input: CreateAttachmentInput): AttachmentRecord {
    return this.attachments.create(input);
  }

  roomList(companyId: string): RoomRecord[] {
    return this.rooms.list(companyId);
  }
}
