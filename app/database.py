import sqlite3

conn = sqlite3.connect('mathmap.db', check_same_thread=False)
cursor = conn.cursor()

cursor.execute('''
CREATE TABLE IF NOT EXISTS students (
    student_id TEXT PRIMARY KEY,
    name TEXT,
    baseline_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
''')
cursor.execute('''
CREATE TABLE IF NOT EXISTS mastery_records (
    student_id TEXT,
    concept TEXT,
    score REAL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, concept)
)
''')
cursor.execute('''
CREATE TABLE IF NOT EXISTS attempt_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT,
    concept TEXT,
    is_correct INTEGER,
    misconception_code TEXT,
    score_before REAL,
    score_after REAL,
    is_baseline_test INTEGER DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
''')
cursor.execute('''
CREATE TABLE IF NOT EXISTS goals (
    student_id TEXT PRIMARY KEY,
    target_concept TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
''')
conn.commit()

def get_or_create_student(student_id):
    cursor.execute("SELECT student_id FROM students WHERE student_id = ?", (student_id,))
    if cursor.fetchone() is None:
        cursor.execute("INSERT INTO students (student_id) VALUES (?)", (student_id,))
        conn.commit()
