"""Validates curriculum.json: structure, ordering, translations, slug/id uniqueness, SQL consistency."""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent
d = json.loads((HERE / "curriculum.json").read_text(encoding="utf-8"))
sql = (HERE.parent.parent / "supabase" / "seed.sql").read_text(encoding="utf-8")
errors = []
ARABIC = re.compile(r"[؀-ۿ]")
PUA = re.compile(r"[-ﭐ-﷿ﹰ-﻿]")  # presentation forms = extraction junk
ids, slugs = set(), set()


def check_id(o, kind):
    for key, seen in (("id", ids), ("slug", slugs)):
        if key in o:
            if o[key] in seen:
                errors.append(f"duplicate {key} {o[key]} ({kind})")
            seen.add(o[key])


def check_text(label, tr):
    for lang in ("ar", "fr"):
        t = tr.get(lang, "")
        if not t.strip():
            errors.append(f"{label}: missing {lang}")
    if not ARABIC.search(tr.get("ar", "")):
        errors.append(f"{label}: ar has no Arabic letters")
    if ARABIC.search(tr.get("fr", "")):
        errors.append(f"{label}: fr contains Arabic letters")
    if PUA.search(tr.get("ar", "")):
        errors.append(f"{label}: ar contains presentation-form/PUA characters")


check_id(d["curriculum"], "curriculum")
check_id(d["subject"], "subject")
for a in d["avatars"]:
    check_id(a, "avatar")
    check_text("avatar " + a["slug"], a["name"])
    if not (HERE.parent.parent / "public" / "avatars" / f"{a['slug']}.svg").exists():
        errors.append(f"avatar {a['slug']}: svg file missing")
check_text("subject", d["subject"]["name"])
n_ch = n_t = 0
for g in d["grades"]:
    check_id(g, "grade")
    check_text(f"grade {g['nummer']}", g["name"])
    orders = [c["reihenfolge"] for c in g["chapters"]]
    if orders != list(range(1, len(orders) + 1)):
        errors.append(f"grade {g['nummer']}: chapter order not contiguous {orders}")
    for c in g["chapters"]:
        n_ch += 1
        check_id(c, "chapter")
        check_text(c["slug"] + " label", c["label"])
        check_text(c["slug"] + " title", c["title"])
        if c["grade_id"] != g["id"]:
            errors.append(f"{c['slug']}: grade_id mismatch")
        t_orders = [t["reihenfolge"] for t in c["topics"]]
        if t_orders != list(range(1, len(t_orders) + 1)):
            errors.append(f"{c['slug']}: topic order not contiguous")
        weeks = [t["week"] for t in c["topics"]]
        if weeks != sorted(weeks):
            errors.append(f"{c['slug']}: topics not in week order")
        if any(w >= c["review_week"] for w in weeks):
            errors.append(f"{c['slug']}: topic after review week")
        for t in c["topics"]:
            n_t += 1
            check_id(t, "topic")
            check_text(t["slug"], t["title"])
            if t["domain"] not in d["domains"]:
                errors.append(f"{t['slug']}: unknown domain")
            if t["chapter_id"] != c["id"]:
                errors.append(f"{t['slug']}: chapter_id mismatch")

# SQL consistency: every id appears as an inserted row, apostrophes escaped
for name, expected in (("chapters", n_ch), ("topics", n_t), ("grades", len(d["grades"]))):
    got = len(re.findall(rf"^insert into {name} ", sql, flags=re.M))
    if got != expected:
        errors.append(f"seed.sql: {name} rows {got} != {expected}")
n_tr = len(re.findall(r"^  \('", sql, flags=re.M))
expected_tr = 2 * (1 + 1 + len(d["grades"]) + 2 * n_ch + n_t + len(d["avatars"]))
if n_tr != expected_tr:
    errors.append(f"seed.sql: translations {n_tr} != {expected_tr}")

print(f"grades={len(d['grades'])} chapters={n_ch} topics={n_t} translations={n_tr}")
if errors:
    print("ERRORS:")
    print("\n".join(" -", *errors) if False else "\n".join(" - " + e for e in errors))
    sys.exit(1)
print("OK: all checks passed")
