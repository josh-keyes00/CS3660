import os
import re
from datetime import datetime
from uuid import uuid4

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# ---------- Config ----------
load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev_secret_change_me")
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///wizz_wizards.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
ph = PasswordHasher()  # Argon2id under the hood

# ---------- Models ----------
class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    email_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_token = db.Column(db.String(64), nullable=True)  # for future email verification

# ---------- Create DB ----------
with app.app_context():
    db.create_all()

# ---------- Validators ----------
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$", re.IGNORECASE)
PW_RE = re.compile(r"""^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+\=\[\]{};:'",.<>\/?\\|`~]).{8,}$""")

def is_valid_email(email: str) -> bool:
    return bool(EMAIL_RE.match(email or ""))

def is_valid_password(pw: str) -> bool:
    return bool(PW_RE.match(pw or ""))

# ---------- Routes ----------
@app.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    # Basic validation
    if not is_valid_email(email):
        return jsonify(error="Invalid email format."), 400
    if not is_valid_password(password):
        return jsonify(error="Password must be 8+ chars with at least one uppercase letter, one number, and one symbol."), 400

    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return jsonify(error="An account with this email already exists."), 409

    # Hash password (Argon2id)
    password_hash = ph.hash(password)

    # Create user (generate a verification token for email verification if you add email later)
    user = User(
        email=email,
        password_hash=password_hash,
        email_verified=False,
        verification_token=uuid4().hex
    )
    db.session.add(user)
    db.session.commit()

    # In production: send a verification email containing verification_token link
    # e.g., https://yourdomain.com/verify?token=<token>
    return jsonify(message="Account created. Please verify your email.", user_id=user.id), 201


# (Optional) Example login route to show verify usage
@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify(error="Invalid credentials."), 401

    try:
        ph.verify(user.password_hash, password)
    except VerifyMismatchError:
        return jsonify(error="Invalid credentials."), 401

    # TODO: issue session/JWT. For demo, just respond OK.
    return jsonify(message="Logged in.", user_id=user.id), 200


if __name__ == "__main__":
    # Run dev server
    app.run(debug=True)
