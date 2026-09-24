// Domain error thuần (không phải HttpException) — báo hiệu giữa repo và use case
// rằng vừa có duplicate pageNumber (do race condition). Use case sẽ catch và retry.
export class DuplicatePageNumberError extends Error {
  constructor(conversationId: string, pageNumber: number) {
    super(
      `Duplicate pageNumber ${pageNumber} for conversation ${conversationId}`,
    );
    this.name = 'DuplicatePageNumberError';
  }
}
