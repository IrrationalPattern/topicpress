import assert from "node:assert/strict";
import { test } from "node:test";

import { parseIngestCliArgs } from "../dist/ingest.cli.js";

test("parses ingest CLI json and force flags", () => {
  assert.deepEqual(parseIngestCliArgs(["--json"]), { force: false, json: true });
  assert.deepEqual(parseIngestCliArgs(["--force", "--json"]), { force: true, json: true });
});

test("accepts a leading pnpm argument separator", () => {
  assert.deepEqual(parseIngestCliArgs(["--", "--json"]), { force: false, json: true });
  assert.deepEqual(parseIngestCliArgs(["--", "--force", "--json"]), {
    force: true,
    json: true,
  });
});

test("rejects unknown ingest CLI arguments", () => {
  assert.throws(() => parseIngestCliArgs(["--", "--unknown"]), /Unknown argument "--unknown"/);
  assert.throws(() => parseIngestCliArgs(["--force", "--"]), /Unknown argument "--"/);
});
