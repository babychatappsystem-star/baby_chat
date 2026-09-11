import { MessageEntity, CreateMessageProps } from './message.entity';

export interface CreatePageProps {
  conversationId: string;
  pageNumber: number;
  pageSize?: number;
}

export class PageEntity {
  readonly id?: string;
  readonly conversationId: string;
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly startTime: Date;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  private _messages: MessageEntity[];
  private _messageCount: number;
  private _endTime?: Date;

  private constructor(props: {
    id?: string;
    conversationId: string;
    pageNumber: number;
    pageSize: number;
    messages: MessageEntity[];
    messageCount: number;
    startTime: Date;
    endTime?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = props.id;
    this.conversationId = props.conversationId;
    this.pageNumber = props.pageNumber;
    this.pageSize = props.pageSize;
    this._messages = props.messages;
    this._messageCount = props.messageCount;
    this.startTime = props.startTime;
    this._endTime = props.endTime;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  get messages(): ReadonlyArray<MessageEntity> {
    return this._messages;
  }

  get messageCount(): number {
    return this._messageCount;
  }

  get endTime(): Date | undefined {
    return this._endTime;
  }

  // Page đầy khi số tin nhắn đạt pageSize → cần tạo page mới cho tin nhắn tiếp theo.
  get isFull(): boolean {
    return this._messageCount >= this.pageSize;
  }

  // Tạo page MỚI cho conversation. pageNumber bắt đầu từ 1, pageSize giới hạn 1-100.
  static create(props: CreatePageProps): PageEntity {
    if (props.pageNumber < 1) {
      throw new Error('Page number must be >= 1');
    }
    const pageSize = props.pageSize ?? 50;
    if (pageSize < 1 || pageSize > 100) {
      throw new Error('Page size must be between 1 and 100');
    }

    return new PageEntity({
      conversationId: props.conversationId,
      pageNumber: props.pageNumber,
      pageSize,
      messages: [],
      messageCount: 0,
      startTime: new Date(),
    });
  }

  // Khôi phục PageEntity từ DB (đã có id, danh sách messages — không validate lại).
  static reconstitute(props: {
    id: string;
    conversationId: string;
    pageNumber: number;
    pageSize: number;
    messages: MessageEntity[];
    messageCount: number;
    startTime: Date;
    endTime?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }): PageEntity {
    return new PageEntity(props);
  }

  // Thêm message vào page in-memory. Nếu page đầy sau khi thêm → set endTime để đóng page.
  addMessage(props: CreateMessageProps): MessageEntity {
    if (this.isFull) {
      throw new Error(`Page ${this.pageNumber} is full (${this.pageSize} messages)`);
    }

    const message = MessageEntity.create(props);
    this._messages = [...this._messages, message];
    this._messageCount += 1;

    if (this.isFull) {
      this._endTime = new Date();
    }

    return message;
  }
}
