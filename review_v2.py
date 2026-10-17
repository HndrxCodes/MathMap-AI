import json, sys
d = json.load(open("app/question_bank_v2.json", encoding="utf-8"))
args = [a.lower() for a in sys.argv[1:]]
reason = "reason" in args
filt = [a for a in args if a != "reason"]
for c, l in d.items():
    for q in l:
        tag = f"{c} {q['level']} {q['id']}".lower()
        if not all((x in tag) or (x == "flag" and "review" in q) for x in filt):
            continue
        print(f"{q['id']} [{q['level']}] {q['stem']}  {q['math']}")
        for i, o in enumerate(q["options"]):
            mark = "*" if o["correct"] else " "
            print(f"  {'ABCDE'[i]}{mark} {o['text']}   <- {(o['misconception'] or '').replace('miskonsepsi_', '')}")
            if reason and o.get("reason"):
                print(f"       {o['reason']}")
        if q.get("review"):
            print("  !!", q["review"])
        print()
