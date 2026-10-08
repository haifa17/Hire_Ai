import { HttpStatus } from '@nestjs/common';
import { of } from 'rxjs';

import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;

  const makeContext = (statusCode = HttpStatus.OK, url = '/api/v1/things') =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ url }),
        getResponse: () => ({ statusCode }),
      }),
    } as any);

  const makeCallHandler = (value: unknown) =>
    ({
      handle: () => of(value),
    } as any);

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('wraps a plain controller return value into the standard envelope', (done) => {
    const context = makeContext(HttpStatus.OK, '/api/v1/resumes');
    const handler = makeCallHandler({ id: '1', title: 'My Resume' });

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Success',
        data: { id: '1', title: 'My Resume' },
        timestamp: expect.any(String),
        path: '/api/v1/resumes',
      });
      done();
    });
  });

  it('uses a status-specific default message when none is provided', (done) => {
    const context = makeContext(HttpStatus.CREATED, '/api/v1/resumes');
    const handler = makeCallHandler({ id: '2' });

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result.message).toBe('Created successfully');
      expect(result.statusCode).toBe(HttpStatus.CREATED);
      done();
    });
  });

  it('falls back to "Success" for a status code without a specific default message', (done) => {
    const context = makeContext(HttpStatus.ACCEPTED, '/api/v1/resumes');
    const handler = makeCallHandler({ id: '3' });

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result.message).toBe('Success');
      done();
    });
  });

  it('unwraps an already-enveloped value and preserves its message', (done) => {
    const context = makeContext(HttpStatus.OK, '/api/v1/resumes');
    const handler = makeCallHandler({
      message: 'Resume generated',
      data: { id: '4' },
    });

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Resume generated',
        data: { id: '4' },
        timestamp: expect.any(String),
        path: '/api/v1/resumes',
      });
      done();
    });
  });

  it('treats an undefined controller return value as no data with default message', (done) => {
    const context = makeContext(HttpStatus.NO_CONTENT, '/api/v1/resumes/5');
    const handler = makeCallHandler(undefined);

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        statusCode: HttpStatus.NO_CONTENT,
        message: 'No content',
        data: undefined,
        timestamp: expect.any(String),
        path: '/api/v1/resumes/5',
      });
      done();
    });
  });
});
