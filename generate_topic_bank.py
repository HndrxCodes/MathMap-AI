# Bank soal PER TOPIK, terpisah dari bank baseline. Untuk demo: hanya Limit (aljabar + trigonometri), 15 soal.
# Jalankan: python3.11 generate_topic_bank.py        (default: Limit)
import sys, os, re, json
import json as _json

_orig = _json.loads
def _safe(s, *a, **k):  # backslash LaTeX (\sin, \cos, \to) yang tidak di-escape
    try:
        return _orig(s, *a, **k)
    except _json.JSONDecodeError:
        fixed = re.sub(r'(\\["\\/bfnrt]|\\u[0-9a-fA-F]{4})|\\', lambda m: m.group(1) or "\\\\", s)
        return _orig(fixed, *a, **k)
_json.loads = _safe

import generate_bank_v2 as g

g.PLAN = {"easy": 3, "medium": 7, "hard": 5}  # 15 soal

g.MISC.update({
    "miskonsepsi_sin_nol": ("Sine limit at zero", "Treats sin(x)/x as 0 or 'undefined' at x -> 0 instead of using the standard limit sin(x)/x = 1.", "Limit"),
    "miskonsepsi_koef_trig": ("Coefficient in trig limit", "Gets the constant wrong in lim sin(ax)/(bx), e.g. answers a*b or b/a instead of a/b.", "Limit"),
    "miskonsepsi_cos_limit": ("Cosine limit", "Misapplies (1 - cos x)/x^2 as x -> 0, e.g. answers 1 or 0 instead of 1/2.", "Limit"),
    "miskonsepsi_identitas_trig": ("Trig identity slip", "Uses a trigonometric identity incorrectly, e.g. sin 2x = 2 sin x or cos^2 x = 1 - sin x.", "Fungsi"),
})
lim = g.CONCEPTS["Limit"]
lim["scope"] = ("Limits as x approaches a finite number, a MIX of two kinds (about half each; in every batch include both kinds): "
                "(A) ALGEBRAIC: direct substitution, and 0/0 resolved by factoring, cancelling or rationalising; "
                "(B) TRIGONOMETRIC at x -> 0: standard limits sin x / x = 1, tan x / x = 1, sin(ax)/(bx) = a/b, (1 - cos x)/x^2 = 1/2 "
                "and simple combinations of them. Angles are in radians.")
lim["plain"] = "What a value gets close to: algebraic limits like (x^2-9)/(x-3) as x nears 3, and trig limits like sin x / x as x nears 0"
lim["codes"] = lim["codes"] + ["miskonsepsi_sin_nol", "miskonsepsi_koef_trig", "miskonsepsi_cos_limit", "miskonsepsi_identitas_trig"]

OUT = "app/topic_bank_v2.json"
base = {re.sub(r"\s+", "", q["math"])
        for qs in json.load(open("app/question_bank_v2.json", encoding="utf-8")).values() for q in qs}
bank = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}
bad = ("verifier:", "verify_failed")
for c in (sys.argv[1:] or ["Limit"]):
    pre = g.CONCEPTS[c]["prefix"]
    g.CONCEPTS[c]["prefix"] = "T" + pre  # ID berbeda dari bank baseline
    qs = g.make_concept(c)
    good = [q for q in qs if not any(f.startswith(bad) for f in q.get("review", []))]
    if len(good) < 15:
        good = g.make_concept(c, good)  # isi kekurangan (versi make_concept dengan parameter keep)
    g.CONCEPTS[c]["prefix"] = pre
    bank[c] = [q for q in good if re.sub(r"\s+", "", q["math"]) not in base]
    json.dump(bank, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("selesai:", c, len(bank[c]), "soal | ditandai review:", sum("review" in q for q in bank[c]), flush=True)

# tulis ulang agar label miskonsepsi baru dan deskripsi topik terbaru ikut terbaca backend
json.dump({k: {"label": v[0], "description": v[1], "root_concept": v[2]} for k, v in g.MISC.items()},
          open("app/misconceptions_v2.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
json.dump({k: {"display": v["display"], "plain": v["plain"]} for k, v in g.CONCEPTS.items()},
          open("app/concepts_v2.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)

