# KidTrack Backend API

A Flask backend for tracking kindergarten children's daily progress.

## Setup

```bash
pip install -r requirements.txt
python app.py
```

API runs at: http://localhost:5000

---

## API Endpoints

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Check if API is running |

### Schools
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/schools | Create a school |
| GET | /api/schools | List all schools |

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Register teacher or parent |
| POST | /api/auth/login | No | Login and get token |
| GET | /api/auth/me | Yes | Get current user |

### Children
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/children | Teacher | Add a child |
| GET | /api/children | Yes | List children |
| GET | /api/children/:id | Yes | Get one child |
| PUT | /api/children/:id/assign-parent | Teacher | Link parent to child |

### Daily Updates
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/children/:id/updates | Teacher | Post daily update |
| GET | /api/children/:id/updates | Yes | Get all updates for child |
| GET | /api/updates/today | Yes | Get today's updates |

---

## Example Flow

### 1. Create a school
```json
POST /api/schools
{ "name": "Sunshine Kindergarten" }
```

### 2. Register a teacher
```json
POST /api/auth/register
{
  "name": "Ms. Sarah",
  "email": "sarah@sunshine.com",
  "password": "secure123",
  "role": "teacher",
  "school_id": 1
}
```

### 3. Register a parent
```json
POST /api/auth/register
{
  "name": "John Mukasa",
  "email": "john@gmail.com",
  "password": "mypassword",
  "role": "parent",
  "school_id": 1
}
```

### 4. Teacher adds a child
```json
POST /api/children
Authorization: Bearer <teacher_token>
{
  "name": "Emma Mukasa",
  "age": 4,
  "parent_id": 2
}
```

### 5. Teacher posts daily update
```json
POST /api/children/1/updates
Authorization: Bearer <teacher_token>
{
  "mood": "happy",
  "ate_well": true,
  "napped": true,
  "activities": "Drawing, singing, outdoor play",
  "notes": "Emma had a great day and made a new friend!",
  "photo_url": "https://your-storage/photo.jpg"
}
```

### 6. Parent checks update
```json
GET /api/children/1/updates
Authorization: Bearer <parent_token>
```

---

## Mood Options
- happy
- okay  
- sad
- tired

## Deployment
Deploy free on [Render](https://render.com) or [Railway](https://railway.app)
