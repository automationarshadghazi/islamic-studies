import test from "node:test";
import assert from "node:assert/strict";
import {
  normaliseState,
  normaliseText,
  questionText,
  secondsLeft,
  formatTime,
  validContent,
} from "../website/study-core.js";
import { readFileSync } from "node:fs";
test("saved state is schema-normalised without trusting nested values", () => {
  for (const input of [
    null,
    [],
    false,
    "bad",
    12,
    {},
    {
      drafts: { 3: {}, 4: [] },
      reviewed: [1, null, "paper3:test", "paper3:test"],
      last: { paper: "constructor", section: "x" },
      checks: { bad: true, "paper3-1": "yes" },
      timers: { 3: { remaining: Infinity, end: "bad" } },
    },
  ]) {
    const state = normaliseState(input);
    assert.equal(typeof state.drafts["3"], "string");
    assert.equal(typeof state.drafts["4"], "string");
    assert.ok(state.reviewed.every((x) => typeof x === "string"));
    assert.ok(!state.last || ["paper3", "paper4"].includes(state.last.paper));
    assert.equal(typeof state.timers["3"].remaining, "number");
  }
  const state = normaliseState({
    drafts: { 3: "keep this" },
    checks: { "paper3-0": true },
    reviewed: ["x", "x"],
  });
  assert.equal(state.drafts["3"], "keep this");
  assert.equal(state.checks["paper3-0"], true);
  assert.deepEqual(state.reviewed, ["x"]);
});
test("search accepts diacritics, punctuation and full session years", () => {
  assert.equal(normaliseText("Djenné"), "djenne");
  assert.equal(normaliseText("daʿwah"), normaliseText("da'wah"));
  const text = questionText({
    session: "s26",
    paper: "4",
    question: "2",
    tags: "women;modesty",
  });
  assert.ok(text.includes("2026"));
  assert.ok(text.includes("question 2"));
  assert.ok(text.includes("q2"));
});
test("timer calculations use deadlines and handle expiry, pause and bounds", () => {
  assert.equal(secondsLeft({ remaining: 10, end: null }, 1000), 10);
  assert.equal(secondsLeft({ remaining: 5400, end: 62000 }, 1000), 61);
  assert.equal(secondsLeft({ remaining: 5400, end: 1000 }, 2000), 0);
  assert.equal(formatTime(5400), "90:00");
  assert.equal(formatTime(0), "00:00");
  assert.equal(
    normaliseState({ timers: { 3: { remaining: -12, end: null } } }).timers["3"]
      .remaining,
    0,
  );
});
test("built content is complete, sanitised, consistent and includes required case chapters", () => {
  const data = JSON.parse(readFileSync("dist/content.json"));
  assert.ok(validContent(data));
  assert.equal(
    data.documents.paper3.sections.length +
      data.documents.paper4.sections.length,
    19,
  );
  assert.deepEqual(
    data.documents.paper4.modules.map((m) => m.sections.length),
    [2, 2, 3],
  );
  for (const d of Object.values(data.documents))
    for (const s of d.sections) {
      assert.ok(!/<script\b|\bonclick=|href="javascript:/i.test(s.html));
      assert.ok(!/&#(?:x[a-f0-9]+|[0-9]+);/i.test(s.text));
    }
  const invalid = structuredClone(data);
  delete invalid.documents.paper3;
  assert.equal(validContent(invalid), false);
  assert.equal(validContent({}), false);
  assert.equal(validContent(null), false);
});
