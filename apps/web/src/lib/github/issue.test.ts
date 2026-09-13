import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createGithubIssue, GithubApiError, type FetchLike } from "./issue";

function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => body,
  } as unknown as Response;
}

describe("createGithubIssue", () => {
  it("POSTs to the repo's issues endpoint with auth + payload and returns number/url", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    const fetchImpl: FetchLike = async (url, init) => {
      calls.push([url, init]);
      return jsonResponse({ number: 42, html_url: "https://github.com/o/r/issues/42" });
    };

    const issue = await createGithubIssue(
      { repo: "o/r", token: "TOKEN123" },
      { title: "Bug", body: "it broke" },
      fetchImpl,
    );

    assert.deepEqual(issue, { number: 42, url: "https://github.com/o/r/issues/42" });
    const [url, init] = calls[0]!;
    assert.equal(url, "https://api.github.com/repos/o/r/issues");
    assert.equal(init?.method, "POST");
    assert.equal((init?.headers as Record<string, string>).authorization, "Bearer TOKEN123");
    // GitHub rejects requests without a User-Agent — it must always be sent.
    assert.equal((init?.headers as Record<string, string>)["user-agent"], "triage-agent");
    assert.deepEqual(JSON.parse(String(init?.body)), { title: "Bug", body: "it broke" });
  });

  it("throws GithubApiError (without the token) when GitHub rejects", async () => {
    const fetchImpl: FetchLike = async () =>
      jsonResponse({ message: "Not Found" }, { ok: false, status: 404 });
    const err = await createGithubIssue({ repo: "o/r", token: "SECRET" }, { title: "x", body: "y" }, fetchImpl).catch(
      (e: unknown) => e,
    );
    assert.ok(err instanceof GithubApiError);
    assert.match(String(err), /Not Found/);
    assert.doesNotMatch(String(err), /SECRET/);
  });

  it("rejects an invalid repo string", async () => {
    const err = await createGithubIssue({ repo: "not-a-repo", token: "t" }, { title: "x", body: "y" }).catch(
      (e: unknown) => e,
    );
    assert.ok(err instanceof GithubApiError);
    assert.match(String(err), /invalid repo/);
  });
});
