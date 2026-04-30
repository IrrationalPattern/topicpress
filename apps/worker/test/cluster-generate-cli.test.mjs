import assert from "node:assert/strict";
import { test } from "node:test";

import { parseClusterGenerateCliArgs } from "../dist/cluster-generate.cli.js";

test("parses cluster generate CLI json and limit flags", () => {
  assert.deepEqual(parseClusterGenerateCliArgs(["--json", "--limit", "3"]), {
    json: true,
    limit: 3,
  });
  assert.deepEqual(parseClusterGenerateCliArgs(["--", "--limit=2"]), {
    json: false,
    limit: 2,
  });
});

test("rejects invalid cluster generate CLI arguments", () => {
  assert.throws(() => parseClusterGenerateCliArgs(["--bogus"]), /Unknown argument/);
  assert.throws(() => parseClusterGenerateCliArgs(["--limit", "0"]), /positive integer/);
  assert.throws(() => parseClusterGenerateCliArgs(["--limit"]), /positive integer/);
});
