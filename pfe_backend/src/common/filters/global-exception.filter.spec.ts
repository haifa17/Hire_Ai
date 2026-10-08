import {
  HttpStatus,
  HttpException,
  BadRequestException,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';

import { GlobalExceptionFilter } from './global-exception.filter';
import { AppException } from '../exceptions/app.exception';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let request: { url: string };

  const makeHost = (): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({
          headersSent: false,
          status: statusMock,
        }),
      }),
    } as any);

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    request = { url: '/api/v1/test' };
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes through an HttpException with its status and message', () => {
    const exception = new BadRequestException('Bad input');

    filter.catch(exception, makeHost());

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Bad input',
        path: '/api/v1/test',
      }),
    );
    const payload = jsonMock.mock.calls[0][0];
    expect(payload.timestamp).toEqual(expect.any(String));
  });

  it('flattens class-validator array messages into a joined string', () => {
    const exception = new HttpException(
      { message: ['field a is required', 'field b is required'] },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, makeHost());

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'field a is required, field b is required',
      }),
    );
  });

  it('maps an unknown/non-HTTP error to a generic 500 response', () => {
    const exception = new Error('some internal failure');

    filter.catch(exception, makeHost());

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        path: '/api/v1/test',
      }),
    );
  });

  it('maps a completely unrecognized thrown value to a generic 500 response', () => {
    filter.catch('just a string thrown', makeHost());

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      }),
    );
  });

  it('handles an AppException, preserving status, message and errorCode', () => {
    const exception = new AppException(
      'Custom failure',
      HttpStatus.CONFLICT,
      'CONFLICT_CODE',
    );

    filter.catch(exception, makeHost());

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.CONFLICT,
        message: 'Custom failure',
        errorCode: 'CONFLICT_CODE',
      }),
    );
  });

  it('does nothing when the response has already been sent', () => {
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({
          headersSent: true,
          status: statusMock,
        }),
      }),
    } as any;

    filter.catch(new Error('too late'), host);

    expect(statusMock).not.toHaveBeenCalled();
    expect(jsonMock).not.toHaveBeenCalled();
  });
});
