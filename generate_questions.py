import os, re, json
from openai import OpenAI
from sympy import expand
from sympy.parsing.sympy_parser import (parse_expr, standard_transformations,
    implicit_multiplication_application, convert_xor)
from app.tools import question_bank, misconception_map

client = OpenAI(base_url="https://api.tokenfactory.nebius.com/v1/",
                api_key=os.environ["NEBIUS_API_KEY"])
GEN_MODEL = "deepseek-ai/DeepSeek-V4-Pro"
VERIFY_MODEL = "nvidia/nemotron-3-super-120b-a12b"

PLAN = {"mudah": 2, "medium": 4, "sulit": 2}   # per konsep
PREFIX = {"Operasi Bilangan Bulat": "O", "Aljabar Dasar": "A", "Faktorisasi": "F",
          "Persamaan Kuadrat": "P", "Fungsi": "U", "Limit": "L"}
ALLOWED = {
    "Operasi Bilangan Bulat": ["miskonsepsi_kali_negatif", "miskonsepsi_tertukar_operasi"],
    "Aljabar Dasar": ["miskonsepsi_gabung_koefisien", "miskonsepsi_gabung_suku_tidak_sejenis"],
    "Faktorisasi": ["miskonsepsi_tanda_negatif", "miskonsepsi_pemilihan_faktor",
                    "miskonsepsi_tidak_paham_faktorisasi", "miskonsepsi_selisih_kuadrat"],
    "Persamaan Kuadrat": ["miskonsepsi_tidak_paham_konsep_akar", "miskonsepsi_tanda_negatif",
                          "miskonsepsi_pemilihan_faktor"],
    "Fungsi": ["miskonsepsi_substitusi_salah", "miskonsepsi_lupa_konstanta"],
    "Limit": ["miskonsepsi_substitusi_langsung", "miskonsepsi_bentuk_tak_tentu"],
}
T = standard_transformations + (implicit_multiplication_application, convert_xor)

def ask(model, prompt):
    r = client.chat.completions.create(model=model, temperature=0.7,
        messages=[{"role": "user", "content": prompt}])
    txt = r.choices[0].message.content or ""
    m = re.search(r"[\[{].*[\]}]", txt, re.S)
    return json.loads(m.group(0))

def generate(concept, level, n, existing):
    kode = "\n".join(f"- {k}: {misconception_map[k]['deskripsi']}" for k in ALLOWED[concept])
    prompt = f"""Buat {n} soal matematika SMA konsep "{concept}", tingkat {level}.
Aturan:
- Soal isian singkat (bukan pilihan ganda). Tulis pangkat dengan ^ (contoh x^2), seperti: "Faktorkan: x^2 - 5x + 6".
- Jawaban benar harus pasti benar dan unik.
- "distraktor" = 2-3 jawaban SALAH yang realistis ditulis siswa, format penulisan sama dengan jawaban_benar. Tiap kuncinya adalah teks jawaban salah, nilainya HANYA salah satu kode ini:
{kode}
- Jangan duplikat soal ini: {existing}
Balas HANYA JSON array: [{{"soal": "...", "jawaban_benar": "...", "distraktor": {{"jawaban salah": "kode"}}}}]"""
    return ask(GEN_MODEL, prompt)

def sympy_ok(q):  # hanya Faktorisasi; None = tidak bisa dicek
    try:
        expr = parse_expr(q["soal"].split(":", 1)[1].strip(), transformations=T)
        return expand(expr - parse_expr(q["jawaban_benar"], transformations=T)) == 0
    except Exception:
        return None

def llm_verify(q):
    prompt = f"""Selesaikan soal ini sendiri dulu, lalu nilai kunci jawabannya.
Soal: {q['soal']}
Kunci: {q['jawaban_benar']}
Pengecoh: {list(q['distraktor'])}
(Pengecoh dianggap salah jika bukan bentuk jawaban yang diminta soal.)
Balas HANYA JSON: {{"kunci_benar": true/false, "semua_pengecoh_salah": true/false, "catatan": "..."}}"""
    return ask(VERIFY_MODEL, prompt)

def check(concept, q):
    flags = []
    if not all(k in q for k in ("soal", "jawaban_benar", "distraktor")) or not q["distraktor"]:
        return ["struktur_rusak"]
    for jwb, kode in q["distraktor"].items():
        if kode not in ALLOWED[concept]: flags.append(f"kode_tidak_valid:{kode}")
        if jwb.replace(" ", "") == q["jawaban_benar"].replace(" ", ""): flags.append("pengecoh_sama_dengan_kunci")
    if concept == "Faktorisasi" and sympy_ok(q) is False: flags.append("sympy_kunci_salah")
    try:
        v = llm_verify(q)
        if not v.get("kunci_benar"): flags.append("llm_kunci_diragukan")
        if not v.get("semua_pengecoh_salah"): flags.append("llm_pengecoh_diragukan")
    except Exception:
        flags.append("verifikasi_llm_gagal")
    return flags

hasil, total_flag = {}, 0
for concept, pre in PREFIX.items():
    lama = question_bank.get(concept, [])
    for q in lama: q.setdefault("level", "medium")
    hasil[concept] = list(lama)
    nomor = max([int(re.sub(r"\D", "", q["id"]) or 0) for q in lama], default=0) + 1
    for level, n in PLAN.items():
        try:
            batch = generate(concept, level, n, [q["soal"] for q in hasil[concept]])
        except Exception as e:
            print("GAGAL generate", concept, level, e); continue
        for q in batch:
            flags = check(concept, q)
            q["id"], q["level"] = f"{pre}{nomor:03d}", level
            nomor += 1
            if flags: q["perlu_review"] = flags; total_flag += 1
            hasil[concept].append(q)
    print("selesai:", concept, len(hasil[concept]), "soal")

json.dump(hasil, open("question_bank_generated.json", "w"), ensure_ascii=False, indent=2)
print("TOTAL soal ditandai perlu_review:", total_flag)
