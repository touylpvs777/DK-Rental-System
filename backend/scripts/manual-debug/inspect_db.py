import sqlite3, os

db = "crm.db"
print("DB size:", os.path.getsize(db), "bytes")

con = sqlite3.connect(db)
cur = con.cursor()

tables = [t[0] for t in cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()]
print("Tables:", tables)

if "users" in tables:
    cols = [c[1] for c in cur.execute("PRAGMA table_info(users)").fetchall()]
    print("Columns:", cols)
    rows = cur.execute("SELECT id, email, username, full_name, is_active, is_superuser, role_id, created_at FROM users").fetchall()
    print("User count:", len(rows))
    for r in rows:
        print(dict(zip(["id","email","username","full_name","is_active","is_superuser","role_id","created_at"], r)))
else:
    print("users table does not exist")

con.close()
