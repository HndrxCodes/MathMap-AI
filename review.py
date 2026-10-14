import json, sys
d = json.load(open("question_bank_generated.json"))
konsep = sys.argv[1] if len(sys.argv) > 1 else None
level = sys.argv[2] if len(sys.argv) > 2 else None
for c, l in d.items():
    if konsep and konsep.lower() not in c.lower(): continue
    for q in l:
        if level and q.get("level") != level: continue
        print(f"{q['id']} [{q.get('level')}] {q['soal']}")
        print(f"  KUNCI: {q['jawaban_benar']}")
        for j, k in q["distraktor"].items():
            print(f"  x {j}  <- {k.replace('miskonsepsi_', '')}")
        if "perlu_review" in q: print("  !!", q["perlu_review"])
        print()
