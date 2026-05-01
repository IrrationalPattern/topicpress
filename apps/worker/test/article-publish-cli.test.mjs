import assert from "node:assert/strict";
import { test } from "node:test";

import { parseArticlePublishCliArgs } from "../dist/article-publish.cli.js";

test("parses article publish CLI flags", () => {
  assert.deepEqual(parseArticlePublishCliArgs(["--json", "--article-id", "article-1"]), {
    articleId: "article-1",
    json: true,
  });
  assert.deepEqual(
    parseArticlePublishCliArgs(["--", "--article-id=article-2", "--operator-type", "local"]),
    {
      articleId: "article-2",
      json: false,
      operatorType: "local",
    },
  );
});

test("rejects invalid article publish CLI arguments", () => {
  assert.throws(() => parseArticlePublishCliArgs(["--json"]), /--article-id is required/);
  assert.throws(() => parseArticlePublishCliArgs(["--article-id", ""]), /non-empty article id/);
  assert.throws(() => parseArticlePublishCliArgs(["--article-id", "article-1", "--unknown"]), /Unknown argument/);
});
