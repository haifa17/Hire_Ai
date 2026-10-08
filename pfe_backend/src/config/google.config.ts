import { registerAs } from '@nestjs/config';

// Google OAuth is optional. The strategy disables itself when the credentials
// are missing, but it tests them with `??`/`!!`, which an EMPTY string passes
// — and passport then throws "OAuth2Strategy requires a clientID option" at
// boot. Deployments that declare the variable without filling it (a .env
// template, a Docker Compose `environment:` entry) hit exactly that, so treat
// blank as "not configured" here rather than at every call site.
const optionalEnv = (value: string | undefined): string | undefined =>
  value && value.trim() ? value : undefined;

export default registerAs('google', () => ({
  clientId: optionalEnv(process.env.GOOGLE_CLIENT_ID),
  clientSecret: optionalEnv(process.env.GOOGLE_CLIENT_SECRET),
  callbackUrl:
    process.env.GOOGLE_CALLBACK_URL ||
    'http://localhost:3000/api/v1/auth/google/callback',
  stateSecret:
    process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
  stateTtlMs:
    Number.parseInt(process.env.GOOGLE_OAUTH_STATE_TTL_MS ?? '', 10) ||
    10 * 60 * 1000,
}));
