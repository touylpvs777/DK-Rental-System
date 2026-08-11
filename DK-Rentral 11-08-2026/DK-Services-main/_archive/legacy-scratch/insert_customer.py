import sqlite3

conn = sqlite3.connect("dk_service.db")
cursor = conn.cursor()

cursor.execute("""
INSERT INTO customers (name, phone, email)
VALUES (?, ?, ?)
""", (
    "Touy",
    "02012345678",
    "touy@example.com"
))

conn.commit()
conn.close()

print("Customer added successfully!")