from flask import Flask, jsonify, request
import asyncio
import sqlite3
from werkzeug.security import check_password_hash, generate_password_hash

class DB:
    def __init__(self):
        self.path = "backend/db.sqlite3"

    def connect(self):
        db = sqlite3.connect(self.path)
        db.row_factory = sqlite3.Row
        return db

    async def init_db(self):
        db = self.connect()
        db.execute("""
        CREATE TABLE IF NOT EXISTS credentials(
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   email TEXT NOT NULL UNIQUE,
                   username TEXT NOT NULL UNIQUE,
                   name TEXT NOT NULL,
                   password TEXT NOT NULL 
                   );
        
        """)

        db.execute("""
        CREATE TABLE IF NOT EXISTS groups(
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   title TEXT NOT NULL UNIQUE,
                   description TEXT DEFAULT "No Description",
                   total_amount INTEGER NOT NULL ,
                   count INTEGER NOT NULL
                   );
        """)
        db.execute("""
        CREATE TABLE IF NOT EXISTS users(
                   user_id INTEGER NOT NULL,
                   group_id INTEGER NOT NULL,
                   is_paid INTEGER ,
                   amount INTEGER,
                   paid_at INTEGER,
        PRIMARY KEY (user_id, group_id),
        FOREIGN KEY(user_id) REFERENCES credentials(id),
        FOREIGN KEY(group_id) REFERENCES groups(id)
        );

        """)
        db.commit()
        db.close()

db = DB()
app = Flask(__name__)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response


@app.route("/signup", methods=["OPTIONS"])
@app.route("/login", methods=["OPTIONS"])
def auth_preflight():
    return ("", 204)


def row_to_user(row):
    return {
        "id": row["id"],
        "email": row["email"],
        "username": row["username"],
        "name": row["name"],
    }

@app.route("/")
async def home():
    return "Hello World"


@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    username = (data.get("username") or "").strip()
    name = (data.get("name") or "").strip()
    password = data.get("password") or ""

    if not email or not username or not name or not password:
        return jsonify({"error": "email, username, name and password are required"}), 400

    conn = db.connect()
    try:
        conn.execute(
            """
            INSERT INTO credentials (email, username, name, password)
            VALUES (?, ?, ?, ?)
            """,
            (email, username, name, generate_password_hash(password)),
        )
        conn.commit()
        return jsonify({"message": "signup successful"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "email or username already exists"}), 409
    finally:
        conn.close()


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    identifier = (data.get("identifier") or data.get("email") or data.get("username") or "").strip()
    password = data.get("password") or ""

    if not identifier or not password:
        return jsonify({"error": "identifier and password are required"}), 400

    conn = db.connect()
    user = conn.execute(
        """
        SELECT id, email, username, name, password
        FROM credentials
        WHERE email = ? OR username = ?
        """,
        (identifier.lower(), identifier),
    ).fetchone()
    conn.close()

    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "invalid credentials"}), 401

    return jsonify(
        {
            "message": "login successful",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "username": user["username"],
                "name": user["name"],
            },
        }
    ), 200


@app.route("/groups/details", methods=["GET"])
def group_details():
    conn = db.connect()
    groups = conn.execute(
        """
        SELECT id, title, description, total_amount, count
        FROM groups
        ORDER BY id
        """
    ).fetchall()

    result = []
    for group in groups:
        members = conn.execute(
            """
            SELECT c.id, c.email, c.username, c.name, u.is_paid, u.amount, u.paid_at
            FROM users u
            JOIN credentials c ON c.id = u.user_id
            WHERE u.group_id = ?
            ORDER BY c.id
            """,
            (group["id"],),
        ).fetchall()

        result.append(
            {
                "id": group["id"],
                "title": group["title"],
                "description": group["description"],
                "total_amount": group["total_amount"],
                "count": group["count"],
                "user_count": len(members),
                "users": [
                    {
                        "id": member["id"],
                        "email": member["email"],
                        "username": member["username"],
                        "name": member["name"],
                        "is_paid": member["is_paid"],
                        "amount": member["amount"],
                        "paid_at": member["paid_at"],
                    }
                    for member in members
                ],
            }
        )

    conn.close()
    return jsonify({"groups": result}), 200


@app.route("/users/<int:user_id>/details", methods=["GET"])
def user_details(user_id):
    conn = db.connect()
    user = conn.execute(
        """
        SELECT id, email, username, name
        FROM credentials
        WHERE id = ?
        """,
        (user_id,),
    ).fetchone()

    if not user:
        conn.close()
        return jsonify({"error": "user not found"}), 404

    groups = conn.execute(
        """
        SELECT g.id, g.title, g.description, g.total_amount, g.count,
               u.is_paid, u.amount, u.paid_at
        FROM users u
        JOIN groups g ON g.id = u.group_id
        WHERE u.user_id = ?
        ORDER BY g.id
        """,
        (user_id,),
    ).fetchall()
    conn.close()

    return jsonify(
        {
            "user": row_to_user(user),
            "groups": [
                {
                    "id": group["id"],
                    "title": group["title"],
                    "description": group["description"],
                    "total_amount": group["total_amount"],
                    "count": group["count"],
                    "is_paid": group["is_paid"],
                    "amount": group["amount"],
                    "paid_at": group["paid_at"],
                }
                for group in groups
            ],
        }
    ), 200



if __name__== "__main__":
    asyncio.run(db.init_db())
    app.run()
