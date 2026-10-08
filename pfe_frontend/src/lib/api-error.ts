/**
 * Turns API failures into messages a person can act on.
 *
 * Raw failures are not fit for display: axios reports "Request failed with
 * status code 500" or "Network Error", the backend answers a crash with
 * "Internal server error", and validation errors arrive as technical strings
 * ("email must be an email"). Everything user-facing goes through here.
 *
 * These messages live outside next-intl because they are produced in the
 * HTTP layer, where no React hook is available.
 */

type Locale = "en" | "fr";

type GenericKey =
  | "network"
  | "timeout"
  | "server"
  | "unavailable"
  | "tooManyRequests"
  | "validation"
  | "generic";

const GENERIC_MESSAGES: Record<Locale, Record<GenericKey, string>> = {
  en: {
    network:
      "We couldn't reach the server. Check your internet connection and try again.",
    timeout: "This is taking longer than expected. Please try again.",
    server: "Something went wrong on our side. Please try again in a moment.",
    unavailable:
      "This service is temporarily unavailable. Please try again in a few minutes.",
    tooManyRequests:
      "You've made too many attempts. Please wait a minute and try again.",
    validation:
      "Some of the information entered isn't valid. Please check the fields and try again.",
    generic: "Something went wrong. Please try again.",
  },
  fr: {
    network:
      "Impossible de joindre le serveur. Vérifiez votre connexion internet et réessayez.",
    timeout: "L'opération prend plus de temps que prévu. Veuillez réessayer.",
    server:
      "Une erreur est survenue de notre côté. Veuillez réessayer dans un instant.",
    unavailable:
      "Ce service est temporairement indisponible. Veuillez réessayer dans quelques minutes.",
    tooManyRequests:
      "Trop de tentatives. Veuillez patienter une minute avant de réessayer.",
    validation:
      "Certaines informations saisies ne sont pas valides. Vérifiez les champs et réessayez.",
    generic: "Une erreur est survenue. Veuillez réessayer.",
  },
};

/**
 * Clearer, localized wording for the backend's own (English-only) messages
 * that users commonly hit. Keys are the exact backend strings.
 */
const KNOWN_MESSAGES: Record<string, Record<Locale, string>> = {
  "Invalid credentials": {
    en: "Incorrect email or password. Please try again.",
    fr: "E-mail ou mot de passe incorrect. Veuillez réessayer.",
  },
  "Email is already registered": {
    en: "An account already exists with this email. Try signing in instead.",
    fr: "Un compte existe déjà avec cet e-mail. Essayez de vous connecter.",
  },
  "Email is already in use": {
    en: "This email is already used by another account.",
    fr: "Cet e-mail est déjà utilisé par un autre compte.",
  },
  "Current password is incorrect": {
    en: "Your current password is incorrect.",
    fr: "Votre mot de passe actuel est incorrect.",
  },
  "Invalid or expired reset token": {
    en: "This reset link is invalid or has expired. Request a new one.",
    fr: "Ce lien de réinitialisation est invalide ou a expiré. Demandez-en un nouveau.",
  },
  "Password reset token has expired": {
    en: "This reset link has expired. Request a new one.",
    fr: "Ce lien de réinitialisation a expiré. Demandez-en un nouveau.",
  },
  "Invalid or expired verification token": {
    en: "This verification link is invalid or has expired.",
    fr: "Ce lien de vérification est invalide ou a expiré.",
  },
  "Verification token has expired": {
    en: "This verification link has expired.",
    fr: "Ce lien de vérification a expiré.",
  },
  "This account has been suspended": {
    en: "This account has been suspended. Contact support if you think this is a mistake.",
    fr: "Ce compte a été suspendu. Contactez le support si vous pensez qu'il s'agit d'une erreur.",
  },
  "Access denied": {
    en: "You don't have permission to do this.",
    fr: "Vous n'avez pas l'autorisation d'effectuer cette action.",
  },
  "Password must include uppercase, lowercase, number, and special character":
    {
      en: "Your password must include an uppercase letter, a lowercase letter, a number, and a special character.",
      fr: "Votre mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractère spécial.",
    },
};

// Wording produced by class-validator defaults, e.g. "email must be an email".
const TECHNICAL_VALIDATION_PATTERN =
  /\b(must be|must match|must contain|must not|should not|regular expression|must be longer|must be shorter|each value in)\b/i;

type ApiErrorShape = {
  code?: string;
  message?: string;
  response?: {
    status?: number;
    data?: unknown;
  };
};

function currentLocale(): Locale {
  if (typeof document !== "undefined" && document.documentElement.lang.startsWith("fr")) {
    return "fr";
  }
  return "en";
}

function asApiError(error: unknown): ApiErrorShape | null {
  return typeof error === "object" && error !== null ? (error as ApiErrorShape) : null;
}

function backendMessage(error: ApiErrorShape): string | null {
  const data = error.response?.data;
  if (typeof data !== "object" || data === null) return null;

  const message = (data as { message?: unknown }).message;
  if (Array.isArray(message)) return message.filter(Boolean).join(", ") || null;
  return typeof message === "string" && message.trim() ? message.trim() : null;
}

/**
 * The message to show for this failure, or null when the error carries
 * nothing better than the caller's own fallback (e.g. a 404 with no body).
 */
function resolveMessage(error: ApiErrorShape): string | null {
  const messages = GENERIC_MESSAGES[currentLocale()];
  const status = error.response?.status;

  // No response at all: offline, server down, CORS, or a timeout.
  if (!error.response) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return messages.timeout;
    if (error.code === "ERR_NETWORK" || error.message === "Network Error") return messages.network;
    return null;
  }

  // Never show server internals, whatever the backend put in the body.
  if (status === 502 || status === 503 || status === 504) return messages.unavailable;
  if (status !== undefined && status >= 500) return messages.server;
  if (status === 429) return messages.tooManyRequests;

  const message = backendMessage(error);
  if (!message) return null;

  const known = KNOWN_MESSAGES[message];
  if (known) return known[currentLocale()];

  if ((status === 400 || status === 422) && TECHNICAL_VALIDATION_PATTERN.test(message)) {
    return messages.validation;
  }

  // A deliberate business message from the backend ("You already applied…").
  return message;
}

/**
 * Rewrites an API error in place so that every way of reading it
 * (`error.message`, `error.response.data.message`) yields user-friendly text.
 * Called once, by the response interceptor in lib/api.ts.
 */
export function humanizeApiError(error: unknown): void {
  const apiError = asApiError(error);
  if (!apiError) return;

  const friendly = resolveMessage(apiError);

  // Replaces axios's "Request failed with status code …" for callers that
  // read `error.message` directly.
  apiError.message = friendly ?? GENERIC_MESSAGES[currentLocale()].generic;

  // The body is only rewritten when we have something specific, so callers
  // using getApiErrorMessage still get their own contextual fallback otherwise.
  const data = apiError.response?.data;
  if (friendly && typeof data === "object" && data !== null) {
    (data as { message?: unknown }).message = friendly;
  }
}

/**
 * User-facing message for an API error, or `fallback` when the error carries
 * nothing specific. Safe on errors that never went through the interceptor.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = asApiError(error);
  if (!apiError) return fallback;

  // Failures without a server message (e.g. an empty 404) get the caller's
  // contextual fallback, which is more specific than our generic one.
  if (apiError.response && !backendMessage(apiError)) return fallback;

  return resolveMessage(apiError) ?? fallback;
}
