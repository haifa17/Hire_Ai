import { registerAs } from '@nestjs/config';

export default registerAs('throttle', () => ({
  ttl: Number.parseInt(process.env.THROTTLE_TTL, 10) || 60,
  limit: Number.parseInt(process.env.THROTTLE_LIMIT, 10) || 10,
  passwordResetExpirationMinutes:
    Number.parseInt(process.env.PASSWORD_RESET_EXPIRATION_MINUTES, 10) || 30,
  emailVerificationExpirationHours:
    Number.parseInt(process.env.EMAIL_VERIFICATION_EXPIRATION_HOURS, 10) || 24,
}));
