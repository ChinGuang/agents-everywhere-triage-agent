/** Minimal fetch surface we depend on — lets tests inject a fake. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface GithubIssueDraft {
  title: string;
  body: string;
}

export interface CreatedIssue {
  number: number;
  url: string;
}

/**
 * Thrown when GitHub rejects the request or the transport fails. Carries the
 * status and GitHub's message, but never the token (the token is a header, so
 * it must not reach logs via error text).
 */
export class GithubApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(`GitHub issue creation failed${status ? ` (${status})` : ""}: ${detail}`);
    this.name = "GithubApiError";
  }
}

/**
 * Create a GitHub issue in `config.repo` ("owner/name") using a token. Injectable
 * fetch for tests. Errors surface as GithubApiError with GitHub's own message.
 */
export async function createGithubIssue(
  config: { repo: string; token: string },
  draft: GithubIssueDraft,
  fetchImpl: FetchLike = fetch,
): Promise<CreatedIssue> {
  const [owner, name] = config.repo.split("/");
  if (!owner || !name) {
    throw new GithubApiError(0, `invalid repo "${config.repo}" (expected "owner/name")`);
  }

  let response: Response;
  try {
    response = await fetchImpl(`https://api.github.com/repos/${owner}/${name}/issues`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.token}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        // GitHub's REST API rejects requests without a User-Agent (403).
        "user-agent": "triage-agent",
        "x-github-api-version": "2022-11-28",
      },
      body: JSON.stringify({ title: draft.title, body: draft.body }),
    });
  } catch (cause) {
    throw new GithubApiError(0, cause instanceof Error ? cause.message : "network error");
  }

  let payload: { number?: number; html_url?: string; message?: string };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    throw new GithubApiError(response.status, `invalid JSON response (HTTP ${response.status})`);
  }

  if (!response.ok || typeof payload.number !== "number" || typeof payload.html_url !== "string") {
    throw new GithubApiError(response.status, payload.message ?? `HTTP ${response.status}`);
  }
  return { number: payload.number, url: payload.html_url };
}
