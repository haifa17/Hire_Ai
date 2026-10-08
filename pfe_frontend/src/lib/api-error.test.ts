import { getApiErrorMessage, humanizeApiError } from "./api-error";

const FALLBACK = "Could not save.";

const httpError = (status: number, message?: unknown) => ({
  message: `Request failed with status code ${status}`,
  response: { status, data: message === undefined ? {} : { message } },
});

afterEach(() => {
  document.documentElement.lang = "en";
});

describe("getApiErrorMessage", () => {
  it("never exposes server errors, whatever the backend sent", () => {
    const message = getApiErrorMessage(httpError(500, "Internal server error"), FALLBACK);

    expect(message).toMatch(/went wrong on our side/i);
    expect(message).not.toMatch(/500|internal/i);
  });

  it("explains an unreachable server instead of 'Network Error'", () => {
    const message = getApiErrorMessage({ code: "ERR_NETWORK", message: "Network Error" }, FALLBACK);

    expect(message).toMatch(/couldn't reach the server/i);
  });

  it("explains timeouts and rate limits", () => {
    expect(getApiErrorMessage({ code: "ECONNABORTED", message: "timeout" }, FALLBACK)).toMatch(
      /longer than expected/i,
    );
    expect(getApiErrorMessage(httpError(429, "ThrottlerException"), FALLBACK)).toMatch(
      /too many attempts/i,
    );
    expect(getApiErrorMessage(httpError(503, "ECONNREFUSED 127.0.0.1"), FALLBACK)).toMatch(
      /temporarily unavailable/i,
    );
  });

  it("hides class-validator wording behind a plain validation message", () => {
    const message = getApiErrorMessage(
      httpError(400, "email must be an email, phone must be shorter than 30 characters"),
      FALLBACK,
    );

    expect(message).toMatch(/isn't valid/i);
  });

  it("rewords known backend messages and localizes them", () => {
    expect(getApiErrorMessage(httpError(401, "Invalid credentials"), FALLBACK)).toBe(
      "Incorrect email or password. Please try again.",
    );

    document.documentElement.lang = "fr";
    expect(getApiErrorMessage(httpError(401, "Invalid credentials"), FALLBACK)).toBe(
      "E-mail ou mot de passe incorrect. Veuillez réessayer.",
    );
  });

  it("keeps deliberate business messages from the backend", () => {
    expect(getApiErrorMessage(httpError(409, "You already applied to this job."), FALLBACK)).toBe(
      "You already applied to this job.",
    );
  });

  it("uses the caller's fallback when the error says nothing specific", () => {
    expect(getApiErrorMessage(httpError(404), FALLBACK)).toBe(FALLBACK);
    expect(getApiErrorMessage(new Error("boom"), FALLBACK)).toBe(FALLBACK);
    expect(getApiErrorMessage(undefined, FALLBACK)).toBe(FALLBACK);
  });
});

describe("humanizeApiError", () => {
  it("rewrites both error.message and the response body", () => {
    const error = httpError(500, "Internal server error");

    humanizeApiError(error);

    expect(error.message).toMatch(/went wrong on our side/i);
    expect((error.response.data as { message: string }).message).toBe(error.message);
  });

  it("replaces axios's status text even when there is nothing specific to say", () => {
    const error = httpError(404);

    humanizeApiError(error);

    expect(error.message).toBe("Something went wrong. Please try again.");
    // The body is left alone so callers still get their own fallback.
    expect(getApiErrorMessage(error, FALLBACK)).toBe(FALLBACK);
  });

  it("is stable when applied to an already humanized error", () => {
    const error = httpError(401, "Invalid credentials");

    humanizeApiError(error);
    humanizeApiError(error);

    expect(getApiErrorMessage(error, FALLBACK)).toBe(
      "Incorrect email or password. Please try again.",
    );
  });
});
