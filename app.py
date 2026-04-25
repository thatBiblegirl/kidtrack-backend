from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import os

app = Flask(__name__)
CORS(app)

# Config
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///kidtrack.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'kidtrack-secret-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)

db = SQLAlchemy(app)
jwt = JWTManager(app)


# ─────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────

class School(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    users = db.relationship('User', backref='school', lazy=True)
    children = db.relationship('Child', backref='school', lazy=True)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'teacher' or 'parent'
    school_id = db.Column(db.Integer, db.ForeignKey('school.id'), nullable=False)
    children = db.relationship('Child', backref='parent', lazy=True, foreign_keys='Child.parent_id')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'school_id': self.school_id
        }


class Child(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    age = db.Column(db.Integer)
    school_id = db.Column(db.Integer, db.ForeignKey('school.id'), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updates = db.relationship('DailyUpdate', backref='child', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'age': self.age,
            'school_id': self.school_id,
            'parent_id': self.parent_id
        }


class DailyUpdate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    child_id = db.Column(db.Integer, db.ForeignKey('child.id'), nullable=False)
    date = db.Column(db.Date, default=datetime.utcnow().date)
    mood = db.Column(db.String(20))         # happy, okay, sad, tired
    ate_well = db.Column(db.Boolean, default=True)
    napped = db.Column(db.Boolean, default=False)
    activities = db.Column(db.Text)
    notes = db.Column(db.Text)
    photo_url = db.Column(db.String(300))
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'child_id': self.child_id,
            'date': self.date.isoformat(),
            'mood': self.mood,
            'ate_well': self.ate_well,
            'napped': self.napped,
            'activities': self.activities,
            'notes': self.notes,
            'photo_url': self.photo_url,
            'created_at': self.created_at.isoformat()
        }


# ─────────────────────────────────────────
# ROUTES — AUTH
# ─────────────────────────────────────────

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    required = ['name', 'email', 'password', 'role', 'school_id']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    if data['role'] not in ['teacher', 'parent']:
        return jsonify({'error': 'Role must be teacher or parent'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409

    school = School.query.get(data['school_id'])
    if not school:
        return jsonify({'error': 'School not found'}), 404

    user = User(
        name=data['name'],
        email=data['email'],
        role=data['role'],
        school_id=data['school_id']
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity={'id': user.id, 'role': user.role, 'school_id': user.school_id})
    return jsonify({'token': token, 'user': user.to_dict()}), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400

    user = User.query.filter_by(email=data['email']).first()
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401

    token = create_access_token(identity={'id': user.id, 'role': user.role, 'school_id': user.school_id})
    return jsonify({'token': token, 'user': user.to_dict()}), 200


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def me():
    identity = get_jwt_identity()
    user = User.query.get(identity['id'])
    return jsonify({'user': user.to_dict()}), 200


# ─────────────────────────────────────────
# ROUTES — SCHOOLS
# ─────────────────────────────────────────

@app.route('/api/schools', methods=['POST'])
def create_school():
    data = request.get_json()
    if not data.get('name'):
        return jsonify({'error': 'School name is required'}), 400

    school = School(name=data['name'])
    db.session.add(school)
    db.session.commit()
    return jsonify({'id': school.id, 'name': school.name}), 201


@app.route('/api/schools', methods=['GET'])
def get_schools():
    schools = School.query.all()
    return jsonify([{'id': s.id, 'name': s.name} for s in schools]), 200


# ─────────────────────────────────────────
# ROUTES — CHILDREN
# ─────────────────────────────────────────

@app.route('/api/children', methods=['POST'])
@jwt_required()
def add_child():
    identity = get_jwt_identity()
    if identity['role'] != 'teacher':
        return jsonify({'error': 'Only teachers can add children'}), 403

    data = request.get_json()
    if not data.get('name'):
        return jsonify({'error': 'Child name is required'}), 400

    child = Child(
        name=data['name'],
        age=data.get('age'),
        school_id=identity['school_id'],
        parent_id=data.get('parent_id')
    )
    db.session.add(child)
    db.session.commit()
    return jsonify(child.to_dict()), 201


@app.route('/api/children', methods=['GET'])
@jwt_required()
def get_children():
    identity = get_jwt_identity()

    if identity['role'] == 'teacher':
        children = Child.query.filter_by(school_id=identity['school_id']).all()
    else:
        # Parents only see their own children
        children = Child.query.filter_by(parent_id=identity['id']).all()

    return jsonify([c.to_dict() for c in children]), 200


@app.route('/api/children/<int:child_id>', methods=['GET'])
@jwt_required()
def get_child(child_id):
    identity = get_jwt_identity()
    child = Child.query.get_or_404(child_id)

    if identity['role'] == 'parent' and child.parent_id != identity['id']:
        return jsonify({'error': 'Access denied'}), 403

    return jsonify(child.to_dict()), 200


@app.route('/api/children/<int:child_id>/assign-parent', methods=['PUT'])
@jwt_required()
def assign_parent(child_id):
    identity = get_jwt_identity()
    if identity['role'] != 'teacher':
        return jsonify({'error': 'Only teachers can assign parents'}), 403

    data = request.get_json()
    child = Child.query.get_or_404(child_id)
    parent = User.query.get_or_404(data['parent_id'])

    if parent.role != 'parent':
        return jsonify({'error': 'User is not a parent'}), 400

    child.parent_id = parent.id
    db.session.commit()
    return jsonify(child.to_dict()), 200


# ─────────────────────────────────────────
# ROUTES — DAILY UPDATES
# ─────────────────────────────────────────

@app.route('/api/children/<int:child_id>/updates', methods=['POST'])
@jwt_required()
def post_update(child_id):
    identity = get_jwt_identity()
    if identity['role'] != 'teacher':
        return jsonify({'error': 'Only teachers can post updates'}), 403

    child = Child.query.get_or_404(child_id)
    if child.school_id != identity['school_id']:
        return jsonify({'error': 'Access denied'}), 403

    data = request.get_json()

    update = DailyUpdate(
        child_id=child_id,
        mood=data.get('mood', 'happy'),
        ate_well=data.get('ate_well', True),
        napped=data.get('napped', False),
        activities=data.get('activities', ''),
        notes=data.get('notes', ''),
        photo_url=data.get('photo_url', ''),
        created_by=identity['id']
    )
    db.session.add(update)
    db.session.commit()
    return jsonify(update.to_dict()), 201


@app.route('/api/children/<int:child_id>/updates', methods=['GET'])
@jwt_required()
def get_updates(child_id):
    identity = get_jwt_identity()
    child = Child.query.get_or_404(child_id)

    if identity['role'] == 'parent' and child.parent_id != identity['id']:
        return jsonify({'error': 'Access denied'}), 403

    updates = DailyUpdate.query.filter_by(child_id=child_id)\
        .order_by(DailyUpdate.created_at.desc()).all()

    return jsonify([u.to_dict() for u in updates]), 200


@app.route('/api/updates/today', methods=['GET'])
@jwt_required()
def get_today_updates():
    identity = get_jwt_identity()
    today = datetime.utcnow().date()

    if identity['role'] == 'teacher':
        children = Child.query.filter_by(school_id=identity['school_id']).all()
        child_ids = [c.id for c in children]
        updates = DailyUpdate.query.filter(
            DailyUpdate.child_id.in_(child_ids),
            DailyUpdate.date == today
        ).all()
    else:
        children = Child.query.filter_by(parent_id=identity['id']).all()
        child_ids = [c.id for c in children]
        updates = DailyUpdate.query.filter(
            DailyUpdate.child_id.in_(child_ids),
            DailyUpdate.date == today
        ).all()

    return jsonify([u.to_dict() for u in updates]), 200


# ─────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'KidTrack API is running'}), 200


# ─────────────────────────────────────────
# INIT DB + RUN
# ─────────────────────────────────────────

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("✅ Database ready")
    app.run(debug=True, port=5000)
