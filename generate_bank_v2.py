import os, re, sys, json, random
from openai import OpenAI

client = OpenAI(base_url="https://api.tokenfactory.nebius.com/v1/",
                api_key=os.environ["NEBIUS_API_KEY"])
GEN_MODEL = "deepseek-ai/DeepSeek-V4-Pro"
VERIFY_MODEL = "nvidia/nemotron-3-super-120b-a12b"
OUT = "app"
PLAN = {"easy": 2, "medium": 6, "hard": 4}  # 12 soal per konsep

# kode: (label, deskripsi, akar_masalah)
MISC = {
 "miskonsepsi_kali_negatif": ("Negative times negative", "Believes a negative times a negative stays negative.", "Operasi Bilangan Bulat"),
 "miskonsepsi_tertukar_operasi": ("Swapped operation", "Uses the wrong operation, e.g. adds instead of multiplies.", "Operasi Bilangan Bulat"),
 "miskonsepsi_urutan_operasi": ("Order of operations", "Ignores the order of operations, e.g. adds before multiplying or works strictly left to right.", "Operasi Bilangan Bulat"),
 "miskonsepsi_tanda_pengurangan": ("Subtracting a negative", "Treats subtracting a negative number as subtracting a positive one, e.g. 5 - (-3) = 2.", "Operasi Bilangan Bulat"),
 "miskonsepsi_gabung_koefisien": ("Adding coefficients wrongly", "Adds the coefficients of like terms incorrectly.", "Aljabar Dasar"),
 "miskonsepsi_gabung_suku_tidak_sejenis": ("Combining unlike terms", "Combines terms that are not like terms, e.g. 2x + 3 = 5x.", "Aljabar Dasar"),
 "miskonsepsi_substitusi_salah": ("Wrong substitution", "Substitutes a value incorrectly or mixes up the order of operations.", "Aljabar Dasar"),
 "miskonsepsi_distribusi": ("Distribution errors", "Distributes a factor or a minus sign to only the first term inside brackets.", "Aljabar Dasar"),
 "miskonsepsi_pindah_ruas": ("Moving terms across '='", "Keeps the same sign when moving a term to the other side of an equation.", "Aljabar Dasar"),
 "miskonsepsi_kuadrat_jumlah": ("Squaring a sum", "Expands (a+b)^2 as a^2+b^2 and drops the middle term.", "Aljabar Dasar"),
 "miskonsepsi_coret_salah": ("Cancelling terms, not factors", "Cancels individual terms across a fraction instead of common factors.", "Aljabar Dasar"),
 "miskonsepsi_faktor_persekutuan": ("Common factor", "Misses or mishandles a common factor when factoring.", "Aljabar Dasar"),
 "miskonsepsi_lupa_ruas_nol": ("Equation not set to zero", "Applies the zero-product rule without first moving everything to one side.", "Aljabar Dasar"),
 "miskonsepsi_selisih_kuadrat": ("Difference of squares", "Does not recognise a^2 - b^2 = (a-b)(a+b) and tries another method.", "Aljabar Dasar"),
 "miskonsepsi_pemilihan_faktor": ("Wrong factor pair", "Picks numbers that do not satisfy both the product and the sum conditions.", "Aljabar Dasar"),
 "miskonsepsi_tanda_negatif": ("Sign errors", "Finds the right numbers but gets the plus/minus signs wrong.", "Operasi Bilangan Bulat"),
 "miskonsepsi_tidak_paham_faktorisasi": ("Not a product", "Gives an answer that is not a product of factors; does not see factoring as the reverse of multiplying.", "Faktorisasi"),
 "miskonsepsi_tidak_paham_konsep_akar": ("Only one root", "Does not realise a quadratic can have two roots and gives only one.", "Persamaan Kuadrat"),
 "miskonsepsi_rumus_abc": ("Quadratic formula slips", "Makes sign or division errors in the quadratic formula.", "Persamaan Kuadrat"),
 "miskonsepsi_lupa_konstanta": ("Forgotten constant", "Forgets to add or subtract the constant after multiplying.", "Fungsi"),
 "miskonsepsi_komposisi_fungsi": ("Composition order", "Applies functions in the wrong order or multiplies them instead of composing.", "Fungsi"),
 "miskonsepsi_substitusi_langsung": ("Direct substitution on 0/0", "Substitutes the limit value directly and does not notice a 0/0 form.", "Fungsi"),
 "miskonsepsi_bentuk_tak_tentu": ("Indeterminate form", "Does not know how to handle 0/0 and answers 'undefined'.", "Faktorisasi"),
}

CONCEPTS = {
 "Operasi Bilangan Bulat": {"prefix": "INT", "display": "Integer Operations",
   "plain": "Adding, subtracting, multiplying and dividing positive and negative numbers",
   "scope": "Integer arithmetic only: operations with negative numbers, brackets, order of operations. No variables.",
   "codes": ["miskonsepsi_kali_negatif", "miskonsepsi_tertukar_operasi", "miskonsepsi_urutan_operasi", "miskonsepsi_tanda_pengurangan"]},
 "Aljabar Dasar": {"prefix": "ALG", "display": "Basic Algebra",
   "plain": "Simplifying expressions and solving simple equations with x",
   "scope": "Combine like terms, distribute, expand (a+b)^2, solve linear equations in one variable. NO factoring, NO quadratic equations, NO function notation.",
   "codes": ["miskonsepsi_gabung_koefisien", "miskonsepsi_gabung_suku_tidak_sejenis", "miskonsepsi_distribusi", "miskonsepsi_pindah_ruas", "miskonsepsi_kuadrat_jumlah"]},
 "Faktorisasi": {"prefix": "FAC", "display": "Factoring",
   "plain": "Rewriting an expression like x^2 + 5x + 6 as a product such as (x+2)(x+3)",
   "scope": "Factor polynomials: common factor, x^2+bx+c, ax^2+bx+c, difference of squares. The task is always to rewrite an expression as a product.",
   "codes": ["miskonsepsi_tanda_negatif", "miskonsepsi_pemilihan_faktor", "miskonsepsi_tidak_paham_faktorisasi", "miskonsepsi_selisih_kuadrat", "miskonsepsi_faktor_persekutuan"]},
 "Persamaan Kuadrat": {"prefix": "QUA", "display": "Quadratic Equations",
   "plain": "Finding x when an equation contains x^2, like x^2 - 5x + 6 = 0",
   "scope": "Solve ax^2+bx+c=0 by factoring or the quadratic formula; zero-product property. The task is to find the value(s) of x.",
   "codes": ["miskonsepsi_tidak_paham_konsep_akar", "miskonsepsi_lupa_ruas_nol", "miskonsepsi_rumus_abc", "miskonsepsi_tanda_negatif", "miskonsepsi_pemilihan_faktor"]},
 "Fungsi": {"prefix": "FUN", "display": "Functions",
   "plain": "Plugging numbers into rules like f(x) = 2x + 3 and combining functions",
   "scope": "Function notation: evaluate f(a), composition f(g(x)), linear and quadratic functions.",
   "codes": ["miskonsepsi_substitusi_salah", "miskonsepsi_lupa_konstanta", "miskonsepsi_komposisi_fungsi", "miskonsepsi_urutan_operasi"]},
 "Limit": {"prefix": "LIM", "display": "Limits",
   "plain": "What a value gets close to, e.g. what (x^2-9)/(x-3) approaches as x nears 3",
   "scope": "Limits of rational expressions as x approaches a finite number: direct substitution, and 0/0 resolved by factoring and cancelling.",
   "codes": ["miskonsepsi_substitusi_langsung", "miskonsepsi_bentuk_tak_tentu", "miskonsepsi_coret_salah", "miskonsepsi_tanda_negatif", "miskonsepsi_pemilihan_faktor", "miskonsepsi_selisih_kuadrat"]},
}
LEVEL_GUIDE = {
 "easy": "one or two steps, small integers, one obvious trap.",
 "medium": "two to three steps, at least one realistic trap, non-trivial numbers.",
 "hard": "multi-step, leading coefficient not 1 or nested brackets or negative coefficients; distractors are subtle slips a good student could make.",
}
JSON_NOTE = r'In JSON strings write every LaTeX backslash doubled, e.g. "\\frac{1}{2}" and "\\times".'
LETTERS = "ABCDE"


def llm(model, prompt, temperature):
    r = client.chat.completions.create(model=model, temperature=temperature,
        messages=[{"role": "user", "content": prompt}])
    return r.choices[0].message.content or ""


def fix(s):  # karakter kontrol akibat \t \f \b \r \n yang tidak di-escape
    s = str(s)
    for a, b in (("\t", "\\t"), ("\f", "\\f"), ("\b", "\\b"), ("\r", "\\r"), ("\n", "\\n")):
        s = s.replace(a, b)
    return s.strip()


def clean(s):
    return fix(s).strip("$ ").strip()


def latex_ok(s):
    return bool(s) and "$" not in s and "\\\\" not in s and s.count("{") == s.count("}")


def generate(concept, level, n, existing):
    cfg = CONCEPTS[concept]
    kode = "\n".join(f"- {k}: {MISC[k][1]}" for k in cfg["codes"])
    head = f"""You write exam questions for a diagnostic math app for high-school students.
Topic: {cfg['display']}. Scope: {cfg['scope']}
Level: {level}: {LEVEL_GUIDE[level]}
Write {n} NEW questions. Do not reuse these expressions: {existing}

Rules:
- "stem": one short English instruction with NO formulas (e.g. "Factor the expression.").
- "math": the expression or equation in LaTeX, without $ delimiters.
- "correct": the correct answer in LaTeX, without $.
- "distractors": EXACTLY 4 wrong answers in LaTeX, without $. Each must be the exact result of actually performing ONE specific mistake from the list below (work it out, never random numbers). Give "misconception" (a code from the list) and "reason" (one sentence showing the mistake).
- All 5 answers must be different, equally plausible, same format and length. The correct answer must be unique.
- "solution": 1-2 short sentences, math inside $...$.
Allowed misconceptions:
{kode}
"""
    tail = '\nReturn ONLY a JSON array: [{"stem": "...", "math": "...", "correct": "...", "distractors": [{"math": "...", "misconception": "...", "reason": "..."}], "solution": "..."}]\n' + JSON_NOTE
    txt = llm(GEN_MODEL, head + tail, 0.8)
    a, b = txt.find("[{"), txt.rfind("}]")
    return json.loads(txt[a:b + 2])


def build(concept, level, raw):
    allowed = CONCEPTS[concept]["codes"]
    try:
        stem, math = fix(raw["stem"]), clean(raw["math"])
        correct, sol = clean(raw["correct"]), fix(raw.get("solution", ""))
        ds = [(clean(d["math"]), d["misconception"], fix(d.get("reason", ""))) for d in raw["distractors"]]
    except Exception:
        return None, "struct"
    if len(ds) != 4: return None, "need_4_distractors"
    texts = [correct] + [d[0] for d in ds]
    if len({re.sub(r"\s+", "", t) for t in texts}) != 5: return None, "duplicate_options"
    if any(d[1] not in allowed for d in ds): return None, "bad_code"
    if not all(latex_ok(t) for t in texts + [math]): return None, "bad_latex"
    flags = []
    if re.search(r"[=^\\]", stem): flags.append("math_in_stem")
    if any(c in "".join(texts + [math]) for c in "×−²³÷√≠≤≥→∞"): flags.append("unicode_math")
    if any(n > 2 for n in [[d[1] for d in ds].count(d[1]) for d in ds]): flags.append("code_repeat")
    if sol.count("$") % 2: flags.append("solution_dollar")
    opts = [{"text": correct, "correct": True, "misconception": None, "reason": None}] + \
           [{"text": t, "correct": False, "misconception": c, "reason": r} for t, c, r in ds]
    random.Random(math + level).shuffle(opts)
    q = {"concept": concept, "level": level, "stem": stem, "math": math,
         "options": opts, "solution": sol}
    if flags: q["review"] = flags
    return q, None


def verify(q):
    cfg_topics = "\n".join(f"- {c['display']}: {c['scope']}" for c in CONCEPTS.values())
    opts = "\n".join(f"{LETTERS[i]}. {o['text']}" for i, o in enumerate(q["options"]))
    prompt = f"""Solve this question yourself first.
{q['stem']}
{q['math']}
{opts}
List ALL options that are mathematically correct, and name the topic it belongs to (exactly one of):
{cfg_topics}
Reply with ONLY this JSON: {{"correct": ["C"], "topic": "Factoring"}}"""
    out = llm(VERIFY_MODEL, prompt, 0)
    m = re.findall(r'\{[^{}]*"correct"[^{}]*\}', out, re.S)
    return json.loads(m[-1])


def check(q):
    flags = list(q.get("review", []))
    try:
        v = verify(q)
        key = LETTERS[[o["correct"] for o in q["options"]].index(True)]
        if set(v.get("correct", [])) != {key}:
            flags.append("verifier:" + "".join(sorted(v.get("correct", []))) + "_vs_key_" + key)
        if v.get("topic", "").strip().lower() != CONCEPTS[q["concept"]]["display"].lower():
            flags.append("topic:" + str(v.get("topic")))
    except Exception:
        flags.append("verify_failed")
    if flags: q["review"] = flags
    return q


def make_concept(concept):
    pre, out, seen = CONCEPTS[concept]["prefix"], [], set()
    for level, count in PLAN.items():
        got, tries = [], 0
        while len(got) < count and tries < 3:
            tries += 1
            try:
                raws = generate(concept, level, count - len(got), [q["math"] for q in out + got])
            except Exception as e:
                print("  gagal generate:", concept, level, e, flush=True); continue
            for raw in raws:
                q, err = build(concept, level, raw)
                if q is None or re.sub(r"\s+", "", q["math"]) in seen or len(got) >= count: continue
                seen.add(re.sub(r"\s+", "", q["math"]))
                got.append(check(q))
            print(f"  {concept} {level}: {len(got)}/{count} (percobaan {tries})", flush=True)
        out += got
    for i, q in enumerate(out, 1): q["id"] = f"{pre}-{i:03d}"
    return out


if __name__ == "__main__":
    path = f"{OUT}/question_bank_v2.json"
    bank = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
    for c in (sys.argv[1:] or list(CONCEPTS)):
        bank[c] = make_concept(c)
        json.dump(bank, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print("selesai:", c, len(bank[c]), "soal", flush=True)
    json.dump({k: {"label": v[0], "description": v[1], "root_concept": v[2]} for k, v in MISC.items()},
              open(f"{OUT}/misconceptions_v2.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    json.dump({k: {"display": v["display"], "plain": v["plain"]} for k, v in CONCEPTS.items()},
              open(f"{OUT}/concepts_v2.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    n = sum(1 for l in bank.values() for q in l if "review" in q)
    print("TOTAL soal ditandai review:", n)
