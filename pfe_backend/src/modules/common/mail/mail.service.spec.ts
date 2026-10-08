import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import { MailService } from './mail.service';

jest.mock('nodemailer');

describe('MailService', () => {
  let service: MailService;
  const sendMail = jest.fn();

  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, any> = {
        'mail.from': 'no-reply@talentbridge.ai',
        'app.frontendUrl': 'http://localhost:3001',
        'mail.host': 'smtp.example.com',
        'mail.port': 587,
        'mail.user': 'user',
        'mail.pass': 'pass',
      };
      return values[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    sendMail.mockResolvedValue(undefined);
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('sendEmailVerification sends an email with a verification link', async () => {
    await service.sendEmailVerification('jane@example.com', 'token-123');

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.com',
        subject: expect.stringContaining('Verify'),
        html: expect.stringContaining('token-123'),
      }),
    );
  });

  it('sendPasswordReset sends an email with a reset link', async () => {
    await service.sendPasswordReset('jane@example.com', 'reset-456');

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.com',
        subject: expect.stringContaining('Reset'),
        html: expect.stringContaining('reset-456'),
      }),
    );
  });

  it('sendInterviewInvitation sends an email with interview details', async () => {
    await service.sendInterviewInvitation({
      candidateEmail: 'jane@example.com',
      candidateName: 'Jane',
      recruiterName: 'Bob',
      title: 'Technical interview',
      interviewType: 'VIDEO',
      scheduledAt: new Date('2026-01-01T10:00:00Z'),
      duration: 30,
      jobTitle: 'Backend Engineer',
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.com',
        subject: expect.stringContaining('Backend Engineer'),
      }),
    );
  });

  it('swallows errors when sendMail rejects', async () => {
    sendMail.mockRejectedValue(new Error('smtp down'));

    await expect(
      service.sendEmailVerification('jane@example.com', 'token'),
    ).resolves.toBeUndefined();
  });
});
