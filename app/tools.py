import json
from app.database import cursor, conn, get_or_create_student
from app.clients import nebius_client, CLASSIFIER_MODEL, MICROLESSON_MODEL

# ===================== DATA =====================

concept_graph = {
    "Operasi Bilangan Bulat": {"prasyarat": []},
    "Aljabar Dasar": {"prasyarat": ["Operasi Bilangan Bulat"]},
    "Faktorisasi": {"prasyarat": ["Aljabar Dasar"]},
    "Persamaan Kuadrat": {"prasyarat": ["Faktorisasi"]}, 
    "Fungsi": {"prasyarat": ["Aljabar Dasar"]},      # ← baris baru: cabang kedua
    "Limit": {"prasyarat": ["Fungsi"]}
}

question_bank = {
    "Faktorisasi": [
        {
            "id": "F001",
            "soal": "Faktorkan: x^2 - 5x + 6",
            "jawaban_benar": "(x - 2)(x - 3)",
            "distraktor": {
                "(x + 2)(x + 3)": "miskonsepsi_tanda_negatif",
                "(x - 6)(x - 1)": "miskonsepsi_pemilihan_faktor",
                "x(x - 5) + 6": "miskonsepsi_tidak_paham_faktorisasi"
            }
        },
        {
            "id": "F002",
            "soal": "Faktorkan: x^2 - 9",
            "jawaban_benar": "(x - 3)(x + 3)",
            "distraktor": {
                "(x - 9)(x + 1)": "miskonsepsi_selisih_kuadrat",
                "(x - 3)(x - 3)": "miskonsepsi_tanda_negatif"
            }
        }
    ],
    "Operasi Bilangan Bulat": [
        {
            "id": "O001",
            "soal": "Hitung: -4 x (-3)",
            "jawaban_benar": "12",
            "distraktor": {
                "-12": "miskonsepsi_kali_negatif",
                "-7": "miskonsepsi_tertukar_operasi"
            }
        }
    ],
    "Aljabar Dasar": [
        {
            "id": "A001",
            "soal": "Sederhanakan: 3x + 5x - 2",
            "jawaban_benar": "8x - 2",
            "distraktor": {
                "6x - 2": "miskonsepsi_gabung_koefisien",
                "8x - 2x": "miskonsepsi_gabung_suku_tidak_sejenis"
            }
        }
    ],
    "Persamaan Kuadrat": [
        {
            "id": "P001",
            "soal": "Selesaikan: x^2 - 5x + 6 = 0",
            "jawaban_benar": "x = 2 atau x = 3",
            "distraktor": {
                "x = -2 atau x = -3": "miskonsepsi_tanda_negatif",
                "x = 6": "miskonsepsi_tidak_paham_konsep_akar"
            }
        }
    ], 
    "Fungsi": [                                        # ← tambahan baru
        {
            "id": "FN001",
            "soal": "Jika f(x) = 2x + 3, berapa nilai f(4)?",
            "jawaban_benar": "11",
            "distraktor": {
                "14": "miskonsepsi_substitusi_salah",
                "8": "miskonsepsi_lupa_konstanta"
            }
        }
    ],
    "Limit": [                                         # ← tambahan baru
        {
            "id": "L001",
            "soal": "Tentukan nilai dari lim x->2 (x^2 - 4)/(x - 2)",
            "jawaban_benar": "4",
            "distraktor": {
                "0": "miskonsepsi_substitusi_langsung",
                "tidak terdefinisi": "miskonsepsi_bentuk_tak_tentu"
            }
        }
    ]
}

misconception_map = {
    "miskonsepsi_tanda_negatif": {
        "deskripsi": "Siswa menemukan ANGKA faktor yang benar, tapi salah menentukan tanda plus/minus-nya. Contoh: jawaban benar (x-2)(x-3), siswa jawab (x+2)(x+3) — angka 2 dan 3 sudah benar, tapi tandanya salah semua.",
        "akar_masalah": "Operasi Bilangan Bulat"
    },
    "miskonsepsi_pemilihan_faktor": {
        "deskripsi": "Siswa memilih ANGKA faktor yang salah sama sekali (angkanya tidak sesuai perkalian/penjumlahan yang seharusnya), meskipun format tandanya sudah benar. Contoh: jawaban benar (x-2)(x-3), siswa jawab (x-6)(x-1) — angka 6 dan 1 tidak sesuai dengan konstanta 6 saat dijumlah harus dapat -5.",
        "akar_masalah": "Aljabar Dasar"
    },
    "miskonsepsi_tidak_paham_faktorisasi": {
        "deskripsi": "Jawaban siswa TIDAK berbentuk perkalian dua faktor sama sekali (misal masih dalam bentuk penjumlahan/pengurangan, atau cara acak lain), menunjukkan siswa tidak paham konsep faktorisasi sebagai proses balik dari perkalian.",
        "akar_masalah": "Faktorisasi"
    },
    "miskonsepsi_selisih_kuadrat": {
        "deskripsi": "Khusus untuk soal berbentuk a^2 - b^2 (selisih kuadrat sempurna, TANPA suku tengah/x). Siswa tidak mengenali pola ini bisa langsung difaktorkan jadi (a-b)(a+b), malah mencoba cara lain yang salah.",
        "akar_masalah": "Aljabar Dasar"
    },
    "miskonsepsi_kali_negatif": {
        "deskripsi": "Siswa lupa bahwa negatif dikali negatif menghasilkan positif — cenderung menganggap hasil kali dua negatif tetap negatif.",
        "akar_masalah": "Operasi Bilangan Bulat"
    },
    "miskonsepsi_tertukar_operasi": {
        "deskripsi": "Siswa tertukar antara operasi kali dan operasi lain (misal menjumlahkan alih-alih mengalikan).",
        "akar_masalah": "Operasi Bilangan Bulat"
    },
    "miskonsepsi_gabung_koefisien": {
        "deskripsi": "Siswa salah menjumlahkan koefisien suku sejenis (misal 3x+5x dianggap 6x, bukan 8x).",
        "akar_masalah": "Aljabar Dasar"
    },
    "miskonsepsi_gabung_suku_tidak_sejenis": {
        "deskripsi": "Siswa mencoba menggabungkan suku yang sebenarnya tidak sejenis, menghasilkan bentuk yang salah secara struktur.",
        "akar_masalah": "Aljabar Dasar"
    },
    "miskonsepsi_tidak_paham_konsep_akar": {
        "deskripsi": "Siswa tidak memahami bahwa persamaan kuadrat bisa punya 2 akar berbeda dari hasil faktorisasi, hanya menjawab 1 nilai.",
        "akar_masalah": "Persamaan Kuadrat"
    }, 
    "miskonsepsi_substitusi_salah": {                  # ← tambahan baru
        "deskripsi": "Siswa salah memasukkan nilai x ke dalam fungsi, misal keliru urutan operasi (kali dulu vs tambah dulu).",
        "akar_masalah": "Aljabar Dasar"
    },
    "miskonsepsi_lupa_konstanta": {                    # ← tambahan baru
        "deskripsi": "Siswa lupa menambahkan/mengurangkan konstanta setelah mengalikan koefisien dengan nilai x.",
        "akar_masalah": "Fungsi"
    },
    "miskonsepsi_substitusi_langsung": {                # ← tambahan baru
        "deskripsi": "Siswa langsung mensubstitusi nilai limit ke fungsi tanpa menyadari bentuk 0/0 perlu disederhanakan dulu (misal lewat faktorisasi).",
        "akar_masalah": "Fungsi"
    },
    "miskonsepsi_bentuk_tak_tentu": {                   # ← tambahan baru
        "deskripsi": "Siswa tidak tahu cara menangani bentuk limit tak tentu (0/0) lewat faktorisasi atau pembagian, sehingga menyerah atau menjawab 'tidak terdefinisi'.",
        "akar_masalah": "Faktorisasi"
    }
}

THRESHOLD_LEMAH = 0.5

# ===================== TOOLS DETERMINISTIC (no LLM) =====================

def get_question(concept):
    matched_key = None
    for key in question_bank.keys():
        if key.lower() == concept.lower():
            matched_key = key
            break
    if matched_key is None:
        return json.dumps({"error": f"Belum ada soal untuk konsep {concept}"})
    soal = question_bank[matched_key][0]
    return json.dumps({"soal_id": soal["id"], "soal": soal["soal"]})


def reset_student(student_id):
    cursor.execute("DELETE FROM mastery_records WHERE student_id = ?", (student_id,))
    cursor.execute("DELETE FROM attempt_log WHERE student_id = ?", (student_id,))
    cursor.execute("DELETE FROM students WHERE student_id = ?", (student_id,))
    conn.commit()


def get_mastery_map(student_id):
    cursor.execute("SELECT concept, score FROM mastery_records WHERE student_id = ?", (student_id,))
    return dict(cursor.fetchall())


def update_mastery(student_id, concept, is_correct, misconception_code=None, is_baseline_test=False):
    get_or_create_student(student_id)

    cursor.execute(
        "SELECT score FROM mastery_records WHERE student_id = ? AND concept = ?",
        (student_id, concept)
    )
    row = cursor.fetchone()
    current_score = row[0] if row else 0.5

    if is_correct:
        new_score = current_score + (1.0 - current_score) * 0.3
    else:
        new_score = current_score - current_score * 0.3
    new_score = round(max(0.0, min(1.0, new_score)), 3)

    cursor.execute('''
        INSERT INTO mastery_records (student_id, concept, score)
        VALUES (?, ?, ?)
        ON CONFLICT(student_id, concept) DO UPDATE SET score = ?, updated_at = CURRENT_TIMESTAMP
    ''', (student_id, concept, new_score, new_score))

    cursor.execute('''
        INSERT INTO attempt_log (student_id, concept, is_correct, misconception_code, score_before, score_after, is_baseline_test)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (student_id, concept, int(is_correct), misconception_code, current_score, new_score, int(is_baseline_test)))

    conn.commit()

    return {
        "student_id": student_id,
        "concept": concept,
        "score_before": current_score,
        "score_after": new_score
    }


def predict_risk(student_id, target_concept):
    cursor.execute("SELECT student_id FROM students WHERE student_id = ?", (student_id,))
    if cursor.fetchone() is None:
        return {"error": "Siswa tidak ditemukan"}

    mastery = get_mastery_map(student_id)

    def get_all_prerequisites(concept):
        if concept not in concept_graph:
            return []
        direct = concept_graph[concept]["prasyarat"]
        all_prereqs = list(direct)
        for p in direct:
            all_prereqs.extend(get_all_prerequisites(p))
        return list(set(all_prereqs))

    prereqs = get_all_prerequisites(target_concept)
    prasyarat_lemah = [{"concept": p, "skor": mastery[p]} for p in prereqs if p in mastery and mastery[p] < THRESHOLD_LEMAH]
    prasyarat_belum_dicoba = [p for p in prereqs if p not in mastery]

    if prasyarat_lemah:
        risk_level = "TINGGI"
        rekomendasi = f"Sebaiknya perkuat dulu: {[p['concept'] for p in prasyarat_lemah]}"
    elif prasyarat_belum_dicoba:
        risk_level = "BELUM DIKETAHUI"
        rekomendasi = "Prasyarat cukup kuat, boleh lanjut"
    else:
        risk_level = "RENDAH"
        rekomendasi = "Prasyarat cukup kuat, boleh lanjut"

    return {
        "target_concept": target_concept,
        "risk_level": risk_level,
        "prasyarat_lemah": prasyarat_lemah,
        "prasyarat_belum_dicoba": prasyarat_belum_dicoba,
        "rekomendasi": rekomendasi
    }


def create_learning_plan(student_id, target_concept, threshold=0.7):
    mastery = get_mastery_map(student_id)

    visited = set()
    order = []
    def topo(concept):
        if concept in visited:
            return
        visited.add(concept)
        for p in concept_graph.get(concept, {}).get("prasyarat", []):
            topo(p)
        order.append(concept)
    topo(target_concept)

    plan = []
    phase = 1
    for concept in order:
        score = mastery.get(concept)
        if concept == target_concept:
            continue
        elif score is None:
            reason = "Belum pernah dicoba, perlu dipastikan dasarnya kuat"
        elif score < threshold:
            reason = f"Penguasaan masih {score} (di bawah {threshold}), perlu diperkuat"
        else:
            continue
        plan.append({"phase": phase, "concept": concept, "reason": reason, "score_saat_ini": score})
        phase += 1

    plan.append({
        "phase": phase,
        "concept": target_concept,
        "reason": "Konsep target — pelajari & latihan penerapan",
        "score_saat_ini": mastery.get(target_concept)
    })

    return {"student_id": student_id, "target_concept": target_concept, "roadmap": plan}


def set_goal(student_id, target_concept, description=None):
    get_or_create_student(student_id)
    cursor.execute('''
        INSERT INTO goals (student_id, target_concept, description)
        VALUES (?, ?, ?)
        ON CONFLICT(student_id) DO UPDATE SET target_concept = ?, description = ?, created_at = CURRENT_TIMESTAMP
    ''', (student_id, target_concept, description, target_concept, description))
    conn.commit()
    return {"student_id": student_id, "target_concept": target_concept, "description": description}


def get_goal(student_id):
    cursor.execute("SELECT target_concept, description FROM goals WHERE student_id = ?", (student_id,))
    row = cursor.fetchone()
    if row is None:
        return {"error": "Belum ada goal yang ditetapkan"}
    return {"target_concept": row[0], "description": row[1]}


# ===================== TOOLS YANG PAKAI LLM =====================

def classify_misconception(soal_id, jawaban_siswa):
    soal_data = None
    for concept_soal_list in question_bank.values():
        for s in concept_soal_list:
            if s["id"] == soal_id:
                soal_data = s
                break
        if soal_data:
            break

    if soal_data is None:
        return {"error": "Soal tidak ditemukan"}

    daftar_miskonsepsi = "\n".join([
        f"- {kode}: {misconception_map[kode]['deskripsi']}"
        for kode in soal_data["distraktor"].values()
    ])

    prompt = f"""Kamu adalah sistem diagnosis kesalahan matematika.

Soal: {soal_data['soal']}
Jawaban benar: {soal_data['jawaban_benar']}
Jawaban siswa: {jawaban_siswa}

Kemungkinan kategori miskonsepsi untuk soal ini:
{daftar_miskonsepsi}

Jika jawaban siswa BENAR, balas hanya dengan: BENAR
Jika SALAH, tentukan kategori miskonsepsi mana yang paling cocok dari daftar di atas.
Balas HANYA dengan kode miskonsepsi-nya (contoh: miskonsepsi_tanda_negatif), tanpa penjelasan."""

    response = nebius_client.chat.completions.create(
        model=CLASSIFIER_MODEL,
        messages=[{"role": "user", "content": prompt}]
    )
    hasil = response.choices[0].message.content.strip()

    if hasil == "BENAR":
        return {"status": "benar"}
    else:
        detail = misconception_map.get(hasil, {})
        return {
            "status": "salah",
            "kode_miskonsepsi": hasil,
            "deskripsi": detail.get("deskripsi", "Tidak diketahui"),
            "akar_masalah": detail.get("akar_masalah", "Tidak diketahui")
        }


def generate_micro_lesson(concept, student_misconception=None, bahasa_siswa="Indonesia"):
    context = ""
    if student_misconception:
        context = f"\nSiswa sebelumnya mengalami miskonsepsi: {student_misconception}"

    prompt = f"""Kamu adalah penulis materi pembelajaran matematika.
Buatkan micro-lesson untuk konsep: {concept}{context}

ATURAN WAJIB:
- Tulis dalam bahasa: {bahasa_siswa}
- Gunakan PERSIS label berikut, dengan emoji dan format bold markdown, JANGAN diubah urutannya atau digabung jadi paragraf:

📘 **Konsep**
<apa yang harus dipahami siswa>

💡 **Intuisi**
<penjelasan intuitif, kenapa konsep ini bekerja>

🧩 **Analogi**
<analogi sehari-hari yang memudahkan>

✏️ **Contoh Soal**
<1 contoh soal dikerjakan step-by-step>

⚠️ **Kesalahan Umum**
<kesalahan umum yang sering terjadi>

🎯 **Latihan**
<1 soal latihan baru untuk dicoba siswa>
"""

    response = nebius_client.chat.completions.create(
        model=MICROLESSON_MODEL,
        messages=[{"role": "user", "content": prompt}]
    )
    content = response.choices[0].message.content
    return {"concept": concept, "micro_lesson": content}


# ===================== SKEMA TOOL & MAPPING =====================

all_tools = [
    {"type": "function", "function": {
        "name": "get_question",
        "description": "Ambil soal matematika untuk konsep tertentu",
        "parameters": {"type": "object", "properties": {"concept": {"type": "string"}}, "required": ["concept"]}
    }},
    {"type": "function", "function": {
        "name": "classify_misconception",
        "description": "Analisis jawaban siswa untuk soal tertentu, deteksi apakah benar atau ada miskonsepsi spesifik",
        "parameters": {"type": "object", "properties": {
            "soal_id": {"type": "string"}, "jawaban_siswa": {"type": "string"}
        }, "required": ["soal_id", "jawaban_siswa"]}
    }},
    {"type": "function", "function": {
        "name": "update_mastery",
        "description": "Update skor penguasaan siswa untuk suatu konsep setelah attempt",
        "parameters": {"type": "object", "properties": {
            "student_id": {"type": "string"}, "concept": {"type": "string"},
            "is_correct": {"type": "boolean"}, "misconception_code": {"type": "string"}
        }, "required": ["student_id", "concept", "is_correct"]}
    }},
    {"type": "function", "function": {
        "name": "predict_risk",
        "description": "Prediksi risiko siswa gagal di suatu konsep berdasarkan penguasaan prasyaratnya",
        "parameters": {"type": "object", "properties": {
            "student_id": {"type": "string"}, "target_concept": {"type": "string"}
        }, "required": ["student_id", "target_concept"]}
    }},
    {"type": "function", "function": {
        "name": "generate_micro_lesson",
        "description": "Buat materi pembelajaran lengkap (intuisi, analogi, contoh, latihan) untuk 1 konsep matematika, opsional disesuaikan dengan miskonsepsi siswa sebelumnya",
        "parameters": {"type": "object", "properties": {
            "concept": {"type": "string", "description": "Nama konsep matematika, misal 'Faktorisasi'"},
            "student_misconception": {"type": "string", "description": "Kode miskonsepsi siswa jika ada. Kosongkan jika tidak relevan."},
            "bahasa_siswa": {"type": "string", "description": "Bahasa yang dipakai siswa dalam percakapan. Deteksi dari pesan siswa."}
        }, "required": ["concept"]}
    }},
    {"type": "function", "function": {
        "name": "create_learning_plan",
        "description": "Susun roadmap belajar bertahap menuju 1 konsep target, berdasarkan prasyarat yang belum dikuasai siswa",
        "parameters": {"type": "object", "properties": {
            "student_id": {"type": "string"}, "target_concept": {"type": "string"}
        }, "required": ["student_id", "target_concept"]}
    }},
    {"type": "function", "function": {
        "name": "set_goal",
        "description": "Simpan target belajar siswa (goal)",
        "parameters": {"type": "object", "properties": {
            "student_id": {"type": "string"}, "target_concept": {"type": "string"},
            "description": {"type": "string"}
        }, "required": ["student_id", "target_concept"]}
    }},
    {"type": "function", "function": {
        "name": "get_goal",
        "description": "Ambil goal yang sudah ditetapkan siswa sebelumnya",
        "parameters": {"type": "object", "properties": {"student_id": {"type": "string"}}, "required": ["student_id"]}
    }}
]

available_functions = {
    "get_question": lambda args: get_question(args["concept"]),
    "classify_misconception": lambda args: json.dumps(classify_misconception(args["soal_id"], args["jawaban_siswa"])),
    "update_mastery": lambda args: json.dumps(update_mastery(args["student_id"], args["concept"], args["is_correct"], args.get("misconception_code"))),
    "predict_risk": lambda args: json.dumps(predict_risk(args["student_id"], args["target_concept"])),
    "generate_micro_lesson": lambda args: json.dumps(generate_micro_lesson(args["concept"], args.get("student_misconception"), args.get("bahasa_siswa", "Indonesia"))),
    "create_learning_plan": lambda args: json.dumps(create_learning_plan(args["student_id"], args["target_concept"])),
    "set_goal": lambda args: json.dumps(set_goal(args["student_id"], args["target_concept"], args.get("description"))),
    "get_goal": lambda args: json.dumps(get_goal(args["student_id"])),
}
