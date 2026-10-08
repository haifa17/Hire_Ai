import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

type InterviewInvitationPayload = {
  candidateEmail: string;
  candidateName: string;
  recruiterName: string;
  title: string;
  interviewType: 'VIDEO' | 'ONSITE' | 'PHONE';
  scheduledAt: Date;
  duration: number;
  message?: string;
  jobTitle: string;
  location?: string;
};

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.from = this.configService.get<string>('mail.from');
    this.frontendUrl = this.configService.get<string>('app.frontendUrl');

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host'),
      port: this.configService.get<number>('mail.port'),
      secure: false, // STARTTLS
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.pass'),
      },
    });
  }

  async sendEmailVerification(email: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/verify-email?token=${token}`;
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'TalentBridge AI — Verify your email address',
        html: `
          <h2>Welcome to TalentBridge AI!</h2>
          <p>Please verify your email by clicking the button below. This link expires in 24 hours.</p>
          <a href="${url}" style="
            display:inline-block;padding:12px 24px;background:#4F46E5;
            color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">
            Verify Email
          </a>
          <p>Or copy this URL: ${url}</p>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
    }
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/reset-password?token=${token}`;
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'TalentBridge AI — Reset your password',
        html: `
          <h2>Password Reset Request</h2>
          <p>Click the button below to reset your password. This link expires in 30 minutes.</p>
          <a href="${url}" style="
            display:inline-block;padding:12px 24px;background:#DC2626;
            color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">
            Reset Password
          </a>
          <p>If you did not request this, please ignore this email.</p>
          <p>Or copy this URL: ${url}</p>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send reset email to ${email}`, error);
    }
  }

  async sendInterviewInvitation(
    payload: InterviewInvitationPayload,
  ): Promise<void> {
    const dateLabel = payload.scheduledAt.toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: payload.candidateEmail,
        subject: `TalentBridge AI — Interview Invitation for ${payload.jobTitle}`,
        html: `
          <h2>Interview Invitation</h2>
          <p>Hello ${payload.candidateName},</p>
          <p>You have been invited to an interview for <strong>${
            payload.jobTitle
          }</strong>.</p>
          <ul>
            <li><strong>Title:</strong> ${payload.title}</li>
            <li><strong>Type:</strong> ${payload.interviewType}</li>
            <li><strong>Date:</strong> ${dateLabel}</li>
            <li><strong>Duration:</strong> ${payload.duration} minutes</li>
            <li><strong>Location:</strong> ${
              payload.location ?? 'To be shared by recruiter'
            }</li>
            <li><strong>Recruiter:</strong> ${payload.recruiterName}</li>
          </ul>
          ${
            payload.message
              ? `<p><strong>Message:</strong> ${payload.message}</p>`
              : ''
          }
          <p>Please contact your recruiter if you need to request changes.</p>
        `,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send interview invitation to ${payload.candidateEmail}`,
        error,
      );
    }
  }
}
