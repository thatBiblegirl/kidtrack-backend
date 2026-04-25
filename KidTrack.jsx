import { useState, useEffect, createContext, useContext } from "react";

const API = "http://localhost:5000/api";

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --sun: #FFD94A;
    --sun-deep: #F5B800;
    --leaf: #4CAF7D;
    --leaf-deep: #388E5E;
    --sky: #E8F4FD;
    --peach: #FF8A65;
    --lavender: #B39DDB;
    --cream: #FFFDF5;
    --ink: #2D2A1E;
    --muted: #8A8570;
    --card: #FFFFFF;
    --radius: 20px;
    --shadow: 0 4px 24px rgba(45,42,30,0.10);
    --shadow-lg: 0 8px 40px rgba(45,42,30,0.15);
  }

  body {
    font-family: 'Nunito', sans-serif;
    background: var(--cream);
    color: var(--ink);
    min-height: 100vh;
  }

  h1, h2, h3 { font-family: 'Fredoka One', cursive; letter-spacing: 0.5px; }

  .app { min-height: 100vh; display: flex; flex-direction: column; }

  /* ── NAV ── */
  .nav {
    background: var(--card);
    border-bottom: 3px solid var(--sun);
    padding: 0 2rem;
    display: flex; align-items: center; justify-content: space-between;
    height: 64px;
    position: sticky; top: 0; z-index: 100;
    box-shadow: 0 2px 12px rgba(45,42,30,0.07);
  }
  .nav-brand { display: flex; align-items: center; gap: 10px; }
  .nav-brand-icon { font-size: 1.8rem; }
  .nav-brand-text { font-family: 'Fredoka One', cursive; font-size: 1.5rem; color: var(--leaf-deep); }
  .nav-brand-text span { color: var(--sun-deep); }
  .nav-right { display: flex; align-items: center; gap: 1rem; }
  .nav-role { background: var(--sky); color: var(--leaf-deep); font-weight: 700;
    font-size: 0.75rem; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; }
  .nav-user { font-weight: 700; color: var(--muted); font-size: 0.9rem; }

  /* ── BUTTONS ── */
  .btn {
    font-family: 'Nunito', sans-serif; font-weight: 800;
    border: none; cursor: pointer; border-radius: 12px;
    padding: 10px 22px; font-size: 0.95rem;
    transition: all 0.18s ease; display: inline-flex; align-items: center; gap: 6px;
  }
  .btn-primary { background: var(--leaf); color: #fff; }
  .btn-primary:hover { background: var(--leaf-deep); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(76,175,125,0.35); }
  .btn-sun { background: var(--sun); color: var(--ink); }
  .btn-sun:hover { background: var(--sun-deep); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(255,217,74,0.4); }
  .btn-ghost { background: transparent; color: var(--muted); border: 2px solid #e0ddd0; }
  .btn-ghost:hover { border-color: var(--leaf); color: var(--leaf); }
  .btn-danger { background: #FFEBEE; color: #C62828; }
  .btn-danger:hover { background: #FFCDD2; }
  .btn-sm { padding: 6px 14px; font-size: 0.82rem; border-radius: 8px; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

  /* ── FORMS ── */
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-label { font-weight: 700; font-size: 0.85rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .form-input {
    font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 600;
    border: 2px solid #E8E5D8; border-radius: 12px;
    padding: 10px 14px; background: var(--cream); color: var(--ink);
    transition: border-color 0.15s;
    width: 100%;
  }
  .form-input:focus { outline: none; border-color: var(--leaf); background: #fff; }
  .form-input::placeholder { color: #C5C2B0; font-weight: 400; }
  select.form-input { cursor: pointer; }
  textarea.form-input { resize: vertical; min-height: 80px; }

  /* ── CARDS ── */
  .card {
    background: var(--card); border-radius: var(--radius);
    box-shadow: var(--shadow); padding: 1.5rem;
    border: 1.5px solid #F0EDE0;
  }
  .card-accent-green { border-top: 4px solid var(--leaf); }
  .card-accent-sun { border-top: 4px solid var(--sun); }
  .card-accent-peach { border-top: 4px solid var(--peach); }

  /* ── LOGIN PAGE ── */
  .login-page {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #FFF9E3 0%, #E8F7EF 60%, #FFF0E8 100%);
    padding: 2rem;
  }
  .login-box {
    background: white; border-radius: 28px; padding: 3rem 2.5rem;
    width: 100%; max-width: 420px; box-shadow: var(--shadow-lg);
    border: 2px solid #F0EDE0;
    animation: slideUp 0.4s ease;
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .login-logo { text-align: center; margin-bottom: 2rem; }
  .login-logo-icon { font-size: 3.5rem; display: block; margin-bottom: 8px; }
  .login-logo h1 { font-size: 2.2rem; color: var(--leaf-deep); }
  .login-logo h1 span { color: var(--sun-deep); }
  .login-logo p { color: var(--muted); font-size: 0.95rem; margin-top: 4px; }
  .login-form { display: flex; flex-direction: column; gap: 1rem; }
  .login-tabs { display: flex; gap: 8px; background: var(--sky); border-radius: 12px; padding: 4px; margin-bottom: 0.5rem; }
  .login-tab { flex: 1; padding: 8px; border: none; border-radius: 8px; font-family: 'Nunito', sans-serif;
    font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.15s;
    background: transparent; color: var(--muted); }
  .login-tab.active { background: white; color: var(--leaf-deep); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .login-error { background: #FFEBEE; color: #C62828; border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; font-weight: 600; }
  .login-switch { text-align: center; margin-top: 1rem; color: var(--muted); font-size: 0.9rem; }
  .login-switch button { background: none; border: none; color: var(--leaf); font-weight: 700; cursor: pointer; font-family: 'Nunito', sans-serif; font-size: 0.9rem; }

  /* ── MAIN LAYOUT ── */
  .main { flex: 1; padding: 2rem; max-width: 1100px; margin: 0 auto; width: 100%; }

  /* ── DASHBOARD ── */
  .dashboard-header { margin-bottom: 2rem; }
  .dashboard-header h2 { font-size: 2rem; color: var(--leaf-deep); }
  .dashboard-header p { color: var(--muted); font-size: 1rem; margin-top: 4px; }
  .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .stat-card {
    background: white; border-radius: 16px; padding: 1.2rem 1.5rem;
    display: flex; align-items: center; gap: 1rem;
    box-shadow: var(--shadow); border: 1.5px solid #F0EDE0;
    animation: fadeIn 0.3s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .stat-icon { font-size: 2rem; }
  .stat-value { font-family: 'Fredoka One', cursive; font-size: 1.8rem; color: var(--ink); line-height: 1; }
  .stat-label { font-size: 0.8rem; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

  /* ── SECTION ── */
  .section { margin-bottom: 2.5rem; }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
  .section-title { font-size: 1.4rem; color: var(--ink); }

  /* ── CHILDREN GRID ── */
  .children-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
  .child-card {
    background: white; border-radius: 18px; padding: 1.2rem;
    box-shadow: var(--shadow); border: 1.5px solid #F0EDE0;
    transition: all 0.2s ease; cursor: pointer;
    animation: fadeIn 0.3s ease;
  }
  .child-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); border-color: var(--leaf); }
  .child-avatar {
    width: 52px; height: 52px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.6rem; margin-bottom: 0.8rem;
  }
  .child-name { font-family: 'Fredoka One', cursive; font-size: 1.2rem; color: var(--ink); }
  .child-age { color: var(--muted); font-size: 0.85rem; font-weight: 600; margin-top: 2px; }
  .child-mood { display: inline-flex; align-items: center; gap: 4px; margin-top: 8px;
    background: var(--sky); border-radius: 20px; padding: 3px 10px; font-size: 0.82rem; font-weight: 700; color: var(--leaf-deep); }

  /* ── UPDATE CARD ── */
  .update-card {
    background: white; border-radius: 18px; padding: 1.4rem;
    box-shadow: var(--shadow); border: 1.5px solid #F0EDE0;
    margin-bottom: 1rem; animation: fadeIn 0.3s ease;
  }
  .update-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
  .update-child-name { font-family: 'Fredoka One', cursive; font-size: 1.1rem; color: var(--leaf-deep); }
  .update-date { font-size: 0.8rem; color: var(--muted); font-weight: 600; }
  .update-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 0.8rem; }
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    border-radius: 20px; padding: 4px 12px; font-size: 0.8rem; font-weight: 700;
  }
  .badge-green { background: #E8F5E9; color: #2E7D32; }
  .badge-yellow { background: #FFFDE7; color: #F57F17; }
  .badge-blue { background: #E3F2FD; color: #1565C0; }
  .badge-red { background: #FFEBEE; color: #C62828; }
  .update-notes { color: var(--ink); font-size: 0.95rem; line-height: 1.6; }
  .update-activities { color: var(--muted); font-size: 0.88rem; margin-top: 4px; font-style: italic; }

  /* ── MODAL ── */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(45,42,30,0.45);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 1rem; animation: fadeIn 0.2s ease;
  }
  .modal {
    background: white; border-radius: 24px; padding: 2rem;
    width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto;
    box-shadow: var(--shadow-lg); animation: slideUp 0.25s ease;
  }
  .modal-title { font-size: 1.5rem; color: var(--leaf-deep); margin-bottom: 1.5rem; }
  .modal-form { display: flex; flex-direction: column; gap: 1rem; }
  .modal-actions { display: flex; gap: 0.8rem; margin-top: 1.5rem; justify-content: flex-end; }

  /* ── MOOD PICKER ── */
  .mood-picker { display: flex; gap: 8px; flex-wrap: wrap; }
  .mood-btn {
    flex: 1; min-width: 70px; padding: 10px 8px; border: 2px solid #E8E5D8;
    border-radius: 12px; background: var(--cream); cursor: pointer;
    text-align: center; font-size: 1.4rem; transition: all 0.15s;
    font-family: 'Nunito', sans-serif;
  }
  .mood-btn span { display: block; font-size: 0.7rem; font-weight: 700; color: var(--muted); margin-top: 2px; }
  .mood-btn.selected { border-color: var(--leaf); background: #E8F5E9; }
  .mood-btn:hover { border-color: var(--leaf); transform: scale(1.05); }

  /* ── TOGGLE ── */
  .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #F0EDE0; }
  .toggle-label { font-weight: 700; color: var(--ink); }
  .toggle { position: relative; width: 44px; height: 24px; }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .toggle-slider {
    position: absolute; inset: 0; background: #E0DDD0; border-radius: 24px;
    cursor: pointer; transition: 0.2s;
  }
  .toggle-slider::before {
    content: ''; position: absolute; height: 18px; width: 18px;
    left: 3px; bottom: 3px; background: white; border-radius: 50%;
    transition: 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  }
  .toggle input:checked + .toggle-slider { background: var(--leaf); }
  .toggle input:checked + .toggle-slider::before { transform: translateX(20px); }

  /* ── EMPTY STATE ── */
  .empty { text-align: center; padding: 3rem 1rem; color: var(--muted); }
  .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
  .empty h3 { font-size: 1.2rem; margin-bottom: 0.5rem; color: var(--ink); }
  .empty p { font-size: 0.9rem; }

  /* ── LOADER ── */
  .loader { text-align: center; padding: 2rem; color: var(--muted); font-weight: 700; }
  .spinner { display: inline-block; width: 28px; height: 28px; border: 3px solid #E8E5D8;
    border-top-color: var(--leaf); border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── TABS ── */
  .tabs { display: flex; gap: 4px; background: #F5F2E8; border-radius: 12px; padding: 4px; margin-bottom: 1.5rem; }
  .tab-btn { flex: 1; padding: 9px 12px; border: none; border-radius: 8px; font-family: 'Nunito', sans-serif;
    font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.15s;
    background: transparent; color: var(--muted); }
  .tab-btn.active { background: white; color: var(--leaf-deep); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

  /* ── PHOTO ── */
  .update-photo { width: 100%; border-radius: 12px; margin-top: 0.8rem; max-height: 200px; object-fit: cover; }

  /* ── IMAGE UPLOAD ── */
  .img-upload-area {
    border: 2px dashed #C8C5B0; border-radius: 14px; padding: 1.2rem;
    text-align: center; cursor: pointer; transition: all 0.2s;
    background: var(--cream); position: relative;
  }
  .img-upload-area:hover { border-color: var(--leaf); background: #F0FAF4; }
  .img-upload-area input[type=file] { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
  .img-upload-icon { font-size: 2rem; margin-bottom: 6px; }
  .img-upload-text { font-weight: 700; color: var(--muted); font-size: 0.88rem; }
  .img-preview { width: 100%; border-radius: 12px; max-height: 180px; object-fit: cover; margin-top: 8px; }
  .img-remove { margin-top: 6px; background: none; border: none; color: #C62828; font-weight: 700;
    font-family: 'Nunito', sans-serif; cursor: pointer; font-size: 0.85rem; }

  @media (max-width: 600px) {
    .main { padding: 1rem; }
    .nav { padding: 0 1rem; }
    .login-box { padding: 2rem 1.5rem; }
    .stats-row { grid-template-columns: 1fr 1fr; }
  }
`;

// ─── CONTEXT ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const MOOD_MAP = {
  happy: { emoji: "😄", label: "Happy" },
  okay:  { emoji: "🙂", label: "Okay" },
  sad:   { emoji: "😢", label: "Sad" },
  tired: { emoji: "😴", label: "Tired" },
};

const AVATARS = ["🧒", "👦", "👧", "🧒‍♀️", "👶"];
const AVATAR_COLORS = ["#FFF3E0", "#E8F5E9", "#E3F2FD", "#FCE4EC", "#F3E5F5"];

const apiFetch = async (path, options = {}, token = null) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
};

const formatDate = (d) => new Date(d).toLocaleDateString("en-UG", { weekday: "short", month: "short", day: "numeric" });

// ─── TOGGLE COMPONENT ─────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }) => (
  <label className="toggle">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    <span className="toggle-slider" />
  </label>
);

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
const LoginPage = ({ onLogin }) => {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("parent");
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", school_id: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch("/schools").then(setSchools).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        const data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email: form.email, password: form.password }) });
        onLogin(data.token, data.user);
      } else {
        if (!form.name || !form.email || !form.password || !form.school_id)
          throw new Error("Please fill in all fields");
        const data = await apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ ...form, role, school_id: parseInt(form.school_id) }) });
        onLogin(data.token, data.user);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <span className="login-logo-icon">🌟</span>
          <h1>Kid<span>Track</span></h1>
          <p>Keeping families connected to the classroom</p>
        </div>

        <div className="login-tabs">
          <button className={`login-tab ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>Login</button>
          <button className={`login-tab ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>Sign Up</button>
        </div>

        <div className="login-form">
          {mode === "register" && (
            <>
              <div className="form-group">
                <label className="form-label">I am a</label>
                <div className="login-tabs" style={{ marginBottom: 0 }}>
                  <button className={`login-tab ${role === "parent" ? "active" : ""}`} onClick={() => setRole("parent")}>👪 Parent</button>
                  <button className={`login-tab ${role === "teacher" ? "active" : ""}`} onClick={() => setRole("teacher")}>📚 Teacher</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" placeholder="Your name" value={form.name} onChange={e => set("name", e.target.value)} />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="email@example.com" value={form.email} onChange={e => set("email", e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => set("password", e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()} />
          </div>

          {mode === "register" && (
            <div className="form-group">
              <label className="form-label">School</label>
              <select className="form-input" value={form.school_id} onChange={e => set("school_id", e.target.value)}>
                <option value="">Select your school...</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {error && <div className="login-error">⚠️ {error}</div>}

          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px" }}
            onClick={submit} disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Login →" : "Create Account →"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ADD UPDATE MODAL ─────────────────────────────────────────────────────────
const AddUpdateModal = ({ child, token, onClose, onSaved }) => {
  const [form, setForm] = useState({ mood: "happy", ate_well: true, napped: false, activities: "", notes: "", photo_url: "" });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoPreview(ev.target.result);
      set("photo_url", ev.target.result); // store as base64
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => { setPhotoPreview(null); set("photo_url", ""); };

  const submit = async () => {
    setLoading(true); setError("");
    try {
      await apiFetch(`/children/${child.id}/updates`, { method: "POST", body: JSON.stringify(form) }, token);
      onSaved();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3 className="modal-title">📝 Update for {child.name}</h3>
        <div className="modal-form">
          <div className="form-group">
            <label className="form-label">Mood today</label>
            <div className="mood-picker">
              {Object.entries(MOOD_MAP).map(([k, v]) => (
                <button key={k} className={`mood-btn ${form.mood === k ? "selected" : ""}`} onClick={() => set("mood", k)}>
                  {v.emoji}<span>{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="toggle-row">
            <span className="toggle-label">🍽️ Ate well</span>
            <Toggle checked={form.ate_well} onChange={v => set("ate_well", v)} />
          </div>
          <div className="toggle-row">
            <span className="toggle-label">😴 Took a nap</span>
            <Toggle checked={form.napped} onChange={v => set("napped", v)} />
          </div>

          <div className="form-group">
            <label className="form-label">Activities</label>
            <input className="form-input" placeholder="Drawing, singing, outdoor play..." value={form.activities} onChange={e => set("activities", e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Notes for parents</label>
            <textarea className="form-input" placeholder="How was their day? Anything special to share..." value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">📸 Photo (optional)</label>
            {!photoPreview ? (
              <div className="img-upload-area">
                <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} />
                <div className="img-upload-icon">📷</div>
                <div className="img-upload-text">Tap to take a photo or choose from gallery</div>
              </div>
            ) : (
              <div>
                <img src={photoPreview} className="img-preview" alt="Preview" />
                <button className="img-remove" onClick={removePhoto}>✕ Remove photo</button>
              </div>
            )}
          </div>

          {error && <div className="login-error">⚠️ {error}</div>}

          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={loading}>
              {loading ? "Saving..." : "✓ Save Update"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── ADD CHILD MODAL ──────────────────────────────────────────────────────────
const AddChildModal = ({ token, onClose, onSaved }) => {
  const [form, setForm] = useState({ name: "", age: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name) { setError("Child name is required"); return; }
    setLoading(true); setError("");
    try {
      await apiFetch("/children", { method: "POST", body: JSON.stringify({ name: form.name, age: form.age ? parseInt(form.age) : null }) }, token);
      onSaved();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3 className="modal-title">👶 Add New Child</h3>
        <div className="modal-form">
          <div className="form-group">
            <label className="form-label">Child's Name</label>
            <input className="form-input" placeholder="e.g. Emma Mukasa" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Age</label>
            <input className="form-input" type="number" placeholder="e.g. 4" value={form.age} onChange={e => set("age", e.target.value)} />
          </div>
          {error && <div className="login-error">⚠️ {error}</div>}
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-sun" onClick={submit} disabled={loading}>
              {loading ? "Adding..." : "✓ Add Child"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── UPDATE CARD ──────────────────────────────────────────────────────────────
const UpdateCard = ({ update, childName }) => {
  const mood = MOOD_MAP[update.mood] || MOOD_MAP.happy;
  return (
    <div className="update-card">
      <div className="update-header">
        <span className="update-child-name">{childName}</span>
        <span className="update-date">{formatDate(update.date)}</span>
      </div>
      <div className="update-badges">
        <span className="badge badge-yellow">{mood.emoji} {mood.label}</span>
        {update.ate_well && <span className="badge badge-green">🍽️ Ate well</span>}
        {update.napped && <span className="badge badge-blue">😴 Napped</span>}
        {!update.ate_well && <span className="badge badge-red">🍽️ Didn't eat much</span>}
      </div>
      {update.notes && <p className="update-notes">{update.notes}</p>}
      {update.activities && <p className="update-activities">🎨 {update.activities}</p>}
      {update.photo_url && <img className="update-photo" src={update.photo_url} alt="Today's photo" onError={e => e.target.style.display = "none"} />}
    </div>
  );
};

// ─── TEACHER DASHBOARD ────────────────────────────────────────────────────────
const TeacherDashboard = ({ token }) => {
  const [children, setChildren] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("children");
  const [showAddChild, setShowAddChild] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childUpdates, setChildUpdates] = useState([]);
  const [showUpdateModal, setShowUpdateModal] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, u] = await Promise.all([
        apiFetch("/children", {}, token),
        apiFetch("/updates/today", {}, token)
      ]);
      setChildren(c); setUpdates(u);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadChildUpdates = async (child) => {
    setSelectedChild(child);
    setTab("detail");
    try {
      const u = await apiFetch(`/children/${child.id}/updates`, {}, token);
      setChildUpdates(u);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, []);

  const updatedToday = new Set(updates.map(u => u.child_id));

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <div>
      <div className="dashboard-header">
        <h2>Teacher Dashboard</h2>
        <p>Manage your class and post daily updates</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-icon">👦</span>
          <div><div className="stat-value">{children.length}</div><div className="stat-label">Children</div></div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div><div className="stat-value">{updates.length}</div><div className="stat-label">Updates Today</div></div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⏳</span>
          <div><div className="stat-value">{children.length - updatedToday.size}</div><div className="stat-label">Pending</div></div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === "children" ? "active" : ""}`} onClick={() => setTab("children")}>👦 Children</button>
        <button className={`tab-btn ${tab === "today" ? "active" : ""}`} onClick={() => setTab("today")}>📋 Today's Updates</button>
        {selectedChild && <button className={`tab-btn ${tab === "detail" ? "active" : ""}`} onClick={() => setTab("detail")}>📖 {selectedChild.name}</button>}
      </div>

      {tab === "children" && (
        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Your Class</h3>
            <button className="btn btn-sun btn-sm" onClick={() => setShowAddChild(true)}>+ Add Child</button>
          </div>
          {children.length === 0 ? (
            <div className="empty"><div className="empty-icon">👶</div><h3>No children yet</h3><p>Add your first child to get started</p></div>
          ) : (
            <div className="children-grid">
              {children.map((c, i) => (
                <div key={c.id} className="child-card" onClick={() => loadChildUpdates(c)}>
                  <div className="child-avatar" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                    {AVATARS[i % AVATARS.length]}
                  </div>
                  <div className="child-name">{c.name}</div>
                  {c.age && <div className="child-age">Age {c.age}</div>}
                  <div style={{ marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {updatedToday.has(c.id)
                      ? <span className="child-mood">✅ Updated today</span>
                      : <span className="child-mood" style={{ background: "#FFF3E0", color: "#E65100" }}>⏳ Needs update</span>
                    }
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: "10px", width: "100%", justifyContent: "center" }}
                    onClick={e => { e.stopPropagation(); setShowUpdateModal(c); }}>
                    + Post Update
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "today" && (
        <div className="section">
          <h3 className="section-title" style={{ marginBottom: "1rem" }}>Today's Updates</h3>
          {updates.length === 0
            ? <div className="empty"><div className="empty-icon">📋</div><h3>No updates yet today</h3><p>Post your first update for a child</p></div>
            : updates.map(u => {
                const child = children.find(c => c.id === u.child_id);
                return <UpdateCard key={u.id} update={u} childName={child?.name || "Unknown"} />;
              })
          }
        </div>
      )}

      {tab === "detail" && selectedChild && (
        <div className="section">
          <div className="section-header">
            <h3 className="section-title">📖 {selectedChild.name}'s History</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowUpdateModal(selectedChild)}>+ New Update</button>
          </div>
          {childUpdates.length === 0
            ? <div className="empty"><div className="empty-icon">📝</div><h3>No updates yet</h3><p>Post the first update for {selectedChild.name}</p></div>
            : childUpdates.map(u => <UpdateCard key={u.id} update={u} childName={selectedChild.name} />)
          }
        </div>
      )}

      {showAddChild && (
        <AddChildModal token={token} onClose={() => setShowAddChild(false)} onSaved={() => { setShowAddChild(false); loadData(); }} />
      )}
      {showUpdateModal && (
        <AddUpdateModal child={showUpdateModal} token={token}
          onClose={() => setShowUpdateModal(null)}
          onSaved={() => { setShowUpdateModal(null); loadData(); if (selectedChild?.id === showUpdateModal.id) loadChildUpdates(showUpdateModal); }} />
      )}
    </div>
  );
};

// ─── PARENT DASHBOARD ─────────────────────────────────────────────────────────
const ParentDashboard = ({ token }) => {
  const [children, setChildren] = useState([]);
  const [updates, setUpdates] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const c = await apiFetch("/children", {}, token);
        setChildren(c);
        const allUpdates = {};
        await Promise.all(c.map(async child => {
          const u = await apiFetch(`/children/${child.id}/updates`, {}, token);
          allUpdates[child.id] = u;
        }));
        setUpdates(allUpdates);
        if (c.length > 0) setSelectedChild(c[0]);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  const childList = selectedChild ? (updates[selectedChild.id] || []) : [];
  const todayUpdates = childList.filter(u => u.date === new Date().toISOString().split("T")[0]);

  return (
    <div>
      <div className="dashboard-header">
        <h2>My Children</h2>
        <p>Stay connected to what's happening at school</p>
      </div>

      {children.length === 0 ? (
        <div className="empty" style={{ marginTop: "3rem" }}>
          <div className="empty-icon">👪</div>
          <h3>No children linked yet</h3>
          <p>Ask your child's teacher to link your account to your child's profile</p>
        </div>
      ) : (
        <>
          {children.length > 1 && (
            <div className="tabs">
              {children.map(c => (
                <button key={c.id} className={`tab-btn ${selectedChild?.id === c.id ? "active" : ""}`}
                  onClick={() => setSelectedChild(c)}>{c.name}</button>
              ))}
            </div>
          )}

          {selectedChild && (
            <>
              <div className="stats-row">
                <div className="stat-card">
                  <span className="stat-icon">📅</span>
                  <div><div className="stat-value">{todayUpdates.length}</div><div className="stat-label">Updates Today</div></div>
                </div>
                <div className="stat-card">
                  <span className="stat-icon">📚</span>
                  <div><div className="stat-value">{childList.length}</div><div className="stat-label">Total Updates</div></div>
                </div>
                {todayUpdates[0] && (
                  <div className="stat-card">
                    <span className="stat-icon">{MOOD_MAP[todayUpdates[0].mood]?.emoji || "😊"}</span>
                    <div><div className="stat-value" style={{ fontSize: "1rem", paddingTop: "4px" }}>Today's mood</div>
                      <div className="stat-label">{MOOD_MAP[todayUpdates[0].mood]?.label}</div></div>
                  </div>
                )}
              </div>

              <div className="section">
                <h3 className="section-title" style={{ marginBottom: "1rem" }}>
                  📖 {selectedChild.name}'s Updates
                </h3>
                {childList.length === 0
                  ? <div className="empty"><div className="empty-icon">📝</div><h3>No updates yet</h3><p>Your child's teacher hasn't posted any updates yet</p></div>
                  : childList.map(u => <UpdateCard key={u.id} update={u} childName={selectedChild.name} />)
                }
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("kt_token"));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kt_user")); } catch { return null; }
  });
  const [checking, setChecking] = useState(true);

  // On load, verify token is still valid against the server
  useEffect(() => {
    const verify = async () => {
      const savedToken = localStorage.getItem("kt_token");
      if (!savedToken) { setChecking(false); return; }
      try {
        const data = await apiFetch("/auth/me", {}, savedToken);
        setToken(savedToken);
        setUser(data.user);
        // Refresh stored user in case details changed
        localStorage.setItem("kt_user", JSON.stringify(data.user));
      } catch {
        // Token expired or invalid — clear and show login
        localStorage.removeItem("kt_token");
        localStorage.removeItem("kt_user");
        setToken(null); setUser(null);
      } finally { setChecking(false); }
    };
    verify();
  }, []);

  const login = (t, u) => {
    setToken(t); setUser(u);
    localStorage.setItem("kt_token", t);
    localStorage.setItem("kt_user", JSON.stringify(u));
  };

  const logout = () => {
    setToken(null); setUser(null);
    localStorage.removeItem("kt_token");
    localStorage.removeItem("kt_user");
  };

  if (checking) return (
    <>
      <style>{styles}</style>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--cream)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🌟</div>
          <div className="spinner" />
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {!token || !user ? (
          <LoginPage onLogin={login} />
        ) : (
          <>
            <nav className="nav">
              <div className="nav-brand">
                <span className="nav-brand-icon">🌟</span>
                <span className="nav-brand-text">Kid<span>Track</span></span>
              </div>
              <div className="nav-right">
                <span className="nav-role">{user.role}</span>
                <span className="nav-user">{user.name}</span>
                <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
              </div>
            </nav>
            <main className="main">
              {user.role === "teacher"
                ? <TeacherDashboard token={token} />
                : <ParentDashboard token={token} />
              }
            </main>
          </>
        )}
      </div>
    </>
  );
}
