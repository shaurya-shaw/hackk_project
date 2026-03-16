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
                   count INTEGER NOT NULL,
                   owner_id INTEGER,
                   FOREIGN KEY(owner_id) REFERENCES credentials(id)
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
        ensure_group_owner_column(db)
        db.commit()
        db.close()

db = DB()
app = Flask(__name__)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,OPTIONS"
    return response


@app.route("/signup", methods=["OPTIONS"])
@app.route("/login", methods=["OPTIONS"])
@app.route("/groups", methods=["OPTIONS"])
@app.route("/groups/<int:group_id>", methods=["OPTIONS"])
@app.route("/groups/<int:group_id>/invite", methods=["OPTIONS"])
def auth_preflight():
    return ("", 204)


def row_to_user(row):
    return {
        "id": row["id"],
        "email": row["email"],
        "username": row["username"],
        "name": row["name"],
    }


def ensure_group_owner_column(conn):
    columns = conn.execute("PRAGMA table_info(groups)").fetchall()
    column_names = {column["name"] for column in columns}
    if "owner_id" not in column_names:
        conn.execute(
            """
            ALTER TABLE groups
            ADD COLUMN owner_id INTEGER REFERENCES credentials(id)
            """
        )
        conn.commit()


def get_user_by_id(conn, user_id):
    return conn.execute(
        """
        SELECT id, email, username, name
        FROM credentials
        WHERE id = ?
        """,
        (user_id,),
    ).fetchone()


def get_group_by_id(conn, group_id):
    return conn.execute(
        """
        SELECT g.id, g.title, g.description, g.total_amount, g.count, g.owner_id,
               c.email AS owner_email, c.username AS owner_username, c.name AS owner_name
        FROM groups g
        LEFT JOIN credentials c ON c.id = g.owner_id
        WHERE g.id = ?
        """,
        (group_id,),
    ).fetchone()


def serialize_group(row, members):
    owner = None
    if row["owner_id"]:
        owner = {
            "id": row["owner_id"],
            "email": row["owner_email"],
            "username": row["owner_username"],
            "name": row["owner_name"],
        }

    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "total_amount": row["total_amount"],
        "count": row["count"],
        "owner_id": row["owner_id"],
        "owner": owner,
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
    ensure_group_owner_column(conn)
    groups = conn.execute(
        """
        SELECT g.id, g.title, g.description, g.total_amount, g.count, g.owner_id,
               c.email AS owner_email, c.username AS owner_username, c.name AS owner_name
        FROM groups g
        LEFT JOIN credentials c ON c.id = g.owner_id
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
            serialize_group(group, members)
        )

    conn.close()
    return jsonify({"groups": result}), 200


@app.route("/groups", methods=["POST"])
def create_group():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip() or "No Description"
    owner_id = data.get("owner_id")
    total_amount = data.get("total_amount")
    count = data.get("count")

    if not title or owner_id is None or total_amount is None or count is None:
        return jsonify({"error": "title, owner_id, total_amount and count are required"}), 400

    conn = db.connect()
    ensure_group_owner_column(conn)

    owner = get_user_by_id(conn, owner_id)
    if not owner:
        conn.close()
        return jsonify({"error": "owner not found"}), 404

    try:
        cursor = conn.execute(
            """
            INSERT INTO groups (title, description, total_amount, count, owner_id)
            VALUES (?, ?, ?, ?, ?)
            """,
            (title, description, total_amount, count, owner_id),
        )
        group_id = cursor.lastrowid
        conn.execute(
            """
            INSERT OR IGNORE INTO users (user_id, group_id, is_paid, amount, paid_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (owner_id, group_id, 0, None, None),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "group title already exists"}), 409

    group = get_group_by_id(conn, group_id)
    members = conn.execute(
        """
        SELECT c.id, c.email, c.username, c.name, u.is_paid, u.amount, u.paid_at
        FROM users u
        JOIN credentials c ON c.id = u.user_id
        WHERE u.group_id = ?
        ORDER BY c.id
        """,
        (group_id,),
    ).fetchall()
    conn.close()
    return jsonify({"message": "group created", "group": serialize_group(group, members)}), 201


@app.route("/groups/<int:group_id>", methods=["PATCH"])
def update_group(group_id):
    data = request.get_json(silent=True) or {}
    requester_id = data.get("requester_id")

    if requester_id is None:
        return jsonify({"error": "requester_id is required"}), 400

    conn = db.connect()
    ensure_group_owner_column(conn)
    group = get_group_by_id(conn, group_id)

    if not group:
        conn.close()
        return jsonify({"error": "group not found"}), 404

    if group["owner_id"] != requester_id:
        conn.close()
        return jsonify({"error": "only the owner can modify this group"}), 403

    title = (data.get("title") or group["title"]).strip()
    description = (data.get("description") or group["description"]).strip()
    total_amount = data.get("total_amount", group["total_amount"])
    count = data.get("count", group["count"])

    try:
        conn.execute(
            """
            UPDATE groups
            SET title = ?, description = ?, total_amount = ?, count = ?
            WHERE id = ?
            """,
            (title, description, total_amount, count, group_id),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "group title already exists"}), 409

    updated_group = get_group_by_id(conn, group_id)
    members = conn.execute(
        """
        SELECT c.id, c.email, c.username, c.name, u.is_paid, u.amount, u.paid_at
        FROM users u
        JOIN credentials c ON c.id = u.user_id
        WHERE u.group_id = ?
        ORDER BY c.id
        """,
        (group_id,),
    ).fetchall()
    conn.close()
    return jsonify({"message": "group updated", "group": serialize_group(updated_group, members)}), 200


@app.route("/groups/<int:group_id>/invite", methods=["POST"])
def invite_user_to_group(group_id):
    data = request.get_json(silent=True) or {}
    requester_id = data.get("requester_id")
    invitee_id = data.get("invitee_id")

    if requester_id is None or invitee_id is None:
        return jsonify({"error": "requester_id and invitee_id are required"}), 400

    conn = db.connect()
    ensure_group_owner_column(conn)
    group = get_group_by_id(conn, group_id)

    if not group:
        conn.close()
        return jsonify({"error": "group not found"}), 404

    if group["owner_id"] != requester_id:
        conn.close()
        return jsonify({"error": "only the owner can invite users"}), 403

    invitee = get_user_by_id(conn, invitee_id)
    if not invitee:
        conn.close()
        return jsonify({"error": "invitee not found"}), 404

    existing_member = conn.execute(
        """
        SELECT 1
        FROM users
        WHERE user_id = ? AND group_id = ?
        """,
        (invitee_id, group_id),
    ).fetchone()

    if existing_member:
        conn.close()
        return jsonify({"error": "user is already in the group"}), 409

    conn.execute(
        """
        INSERT INTO users (user_id, group_id, is_paid, amount, paid_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (invitee_id, group_id, 0, None, None),
    )
    conn.commit()

    members = conn.execute(
        """
        SELECT c.id, c.email, c.username, c.name, u.is_paid, u.amount, u.paid_at
        FROM users u
        JOIN credentials c ON c.id = u.user_id
        WHERE u.group_id = ?
        ORDER BY c.id
        """,
        (group_id,),
    ).fetchall()
    conn.close()
    return jsonify(
        {
            "message": "user invited successfully",
            "group": serialize_group(group, members),
            "invited_user": row_to_user(invitee),
        }
    ), 201


@app.route("/users/<int:user_id>/details", methods=["GET"])
def user_details(user_id):
    conn = db.connect()
    ensure_group_owner_column(conn)
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
        SELECT g.id, g.title, g.description, g.total_amount, g.count, g.owner_id,
               c.email AS owner_email, c.username AS owner_username, c.name AS owner_name,
               u.is_paid, u.amount, u.paid_at
        FROM users u
        JOIN groups g ON g.id = u.group_id
        LEFT JOIN credentials c ON c.id = g.owner_id
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
                    "owner_id": group["owner_id"],
                    "owner": {
                        "id": group["owner_id"],
                        "email": group["owner_email"],
                        "username": group["owner_username"],
                        "name": group["owner_name"],
                    } if group["owner_id"] else None,
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
    conn = db.connect()
    ensure_group_owner_column(conn)
    conn.close()
    app.run()
