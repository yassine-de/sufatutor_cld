import assert from "node:assert/strict";
import { test } from "node:test";
import { maskPhone, normalizePhone } from "./phone.ts";

test("Moroccan national formats become E.164", () => {
  assert.equal(normalizePhone("0612345678"), "+212612345678");
  assert.equal(normalizePhone("06 12 34 56 78"), "+212612345678");
  assert.equal(normalizePhone("712345678"), "+212712345678");
  assert.equal(normalizePhone("+212 6 12-34-56-78"), "+212612345678");
  assert.equal(normalizePhone("00212612345678"), "+212612345678");
  assert.equal(normalizePhone("+2120612345678"), "+212612345678");
});

test("Arabic-Indic digits are accepted", () => {
  assert.equal(normalizePhone("٠٦١٢٣٤٥٦٧٨"), "+212612345678");
});

test("numbers from abroad need the plus sign", () => {
  assert.equal(normalizePhone("+33612345678"), "+33612345678");
  assert.equal(normalizePhone("0033612345678"), "+33612345678");
  assert.equal(normalizePhone("33612345678"), null);
});

test("rejects landlines, short and garbage input", () => {
  assert.equal(normalizePhone("0522123456"), null); // landline, no SMS
  assert.equal(normalizePhone("+212522123456"), null);
  assert.equal(normalizePhone("0612"), null);
  assert.equal(normalizePhone("abc"), null);
  assert.equal(normalizePhone(""), null);
  assert.equal(normalizePhone("+0123456789"), null);
});

test("maskPhone hides the middle", () => {
  assert.equal(maskPhone("+212612345678"), "+212•••78");
});
