import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import mongoose from 'mongoose';
import { GlobalExceptionFilter } from './http-exception.filter';
import { DomainError } from 'src/shared/exceptions/domain-error';

const run = (exception: unknown) => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'GET', url: '/x' }),
    }),
  } as unknown as ArgumentsHost;
  new GlobalExceptionFilter().catch(exception, host);
  return { code: status.mock.calls[0][0], body: json.mock.calls[0][0] };
};

describe('GlobalExceptionFilter', () => {
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  it('keeps HttpException status and message', () => {
    const { code, body } = run(new NotFoundException('nope'));
    expect(code).toBe(404);
    expect(body.message).toBe('nope');
  });

  it('maps DomainError to 400 with its message', () => {
    const { code, body } = run(new DomainError('Name is required'));
    expect(code).toBe(400);
    expect(body).toMatchObject({ error: 'DomainRuleViolation', message: 'Name is required' });
  });

  it('maps invalid ObjectId errors to 400', () => {
    let bsonError: unknown;
    try { new mongoose.Types.ObjectId('abc'); } catch (e) { bsonError = e; }
    expect(run(bsonError).code).toBe(400);
    const cast = new mongoose.Error.CastError('ObjectId', 'abc', '_id');
    expect(run(cast)).toMatchObject({ code: 400, body: { error: 'InvalidId' } });
  });

  it('hides internal error details behind a generic 500', () => {
    const { code, body } = run(new Error('Page 123 not found or already full'));
    expect(code).toBe(500);
    expect(body.message).toBe('Internal server error');
  });
});
