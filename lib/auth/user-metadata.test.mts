import assert from "node:assert/strict";
import test from "node:test";
import { createUserMetadata } from "./user-metadata.ts";

test("maps username to Supabase Auth display metadata fields", () => {
  const metadata = createUserMetadata("  Aoyi Player  ");

  assert.deepEqual(metadata, {
    username: "Aoyi Player",
    full_name: "Aoyi Player",
    name: "Aoyi Player",
    display_name: "Aoyi Player",
  });
});
