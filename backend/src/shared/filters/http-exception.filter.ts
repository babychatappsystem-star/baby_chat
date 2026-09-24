import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BSON, MongoError } from 'mongodb';
import mongoose from 'mongoose';
import { MulterError } from 'multer';
import { DomainError } from 'src/shared/exceptions/domain-error';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | object;
    let error: string;

    if (exception instanceof HttpException) {
      // Handle NestJS HTTP exceptions (includes BusinessException)
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.constructor.name;
      } else {
        message = (exceptionResponse as any).message || exceptionResponse;
        error = (exceptionResponse as any).error || exception.constructor.name;
      }
    } else if (exception instanceof MongoError) {
      // Handle MongoDB errors
      const mongoError = this.handleMongoError(exception);
      status = mongoError.status;
      message = mongoError.message;
      error = 'DatabaseError';
    } else if (exception instanceof MulterError) {
      // Multer abort upload (vd file vượt limits.fileSize). Phải nằm TRƯỚC nhánh
      // Error chung vì MulterError là subclass của Error.
      const multerError = this.handleMulterError(exception);
      status = multerError.status;
      message = multerError.message;
      error = multerError.error;
    } else if (exception instanceof DomainError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      error = 'DomainRuleViolation';
    } else if (this.isInvalidIdError(exception)) {
      // Id sai định dạng ObjectId: Mongoose CastError (query) hoặc BSONError (new ObjectId()).
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid id';
      error = 'InvalidId';
    } else {
      // Lỗi hệ thống: không trả chi tiết nội bộ cho client, chỉ ghi log.
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'InternalServerError';
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} ${status} ${JSON.stringify(message)}`,
      );
    }

    // Send error response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error: error,
      message: message,
    };

    response.status(status).json(errorResponse);
  }

  private isInvalidIdError(exception: unknown): boolean {
    if (exception instanceof mongoose.Error.CastError)
      return exception.kind === 'ObjectId';
    return BSON.BSONError.isBSONError(exception);
  }

  private handleMulterError(error: MulterError): {
    status: number;
    message: string;
    error: string;
  } {
    if (error.code === 'LIMIT_FILE_SIZE') {
      const maxSizeMb = Number(process.env.UPLOAD_MAX_SIZE_MB ?? 5);
      return {
        status: HttpStatus.PAYLOAD_TOO_LARGE,
        message: `File exceeds the maximum allowed size of ${maxSizeMb}MB`,
        error: 'FileTooLarge',
      };
    }
    // LIMIT_UNEXPECTED_FILE, LIMIT_PART_COUNT, ... → bad request chung.
    return {
      status: HttpStatus.BAD_REQUEST,
      message: 'Invalid file upload',
      error: 'InvalidFileUpload',
    };
  }

  private handleMongoError(error: MongoError): {
    status: number;
    message: string;
  } {
    switch (error.code) {
      case 11000: // Duplicate key error
        return {
          status: HttpStatus.CONFLICT,
          message: 'Resource already exists',
        };
      case 11001: // Duplicate key on update
        return {
          status: HttpStatus.CONFLICT,
          message: 'Duplicate key error',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database operation failed',
        };
    }
  }
}
