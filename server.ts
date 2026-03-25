import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "hari-anand-smruti-secret";

app.use(cors());
app.use(express.json());

// Initialize Database
const db = new Database("database.sqlite");

// Create Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    bio TEXT,
    profile_image TEXT
  );

  CREATE TABLE IF NOT EXISTS decorations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    theme TEXT NOT NULL,
    haar_style TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT NOT NULL,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS saved_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    decoration_id INTEGER NOT NULL,
    UNIQUE(user_id, decoration_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (decoration_id) REFERENCES decorations(id)
  );

  CREATE TABLE IF NOT EXISTS timelines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_date TEXT NOT NULL,
    tasks TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed Data
const seedDecorations = [
  { title: "Divine Padhramni", theme: "Spiritual", haar_style: "Traditional Rose", image_url: "https://picsum.photos/seed/deco1/800/600", category: "Traditional" },
  { title: "Spiritual Setup", theme: "Peaceful", haar_style: "White Jasmine", image_url: "https://picsum.photos/seed/deco2/800/600", category: "Aesthetic" },
  { title: "Guruhari Darshan", theme: "Divine", haar_style: "Royal Gold", image_url: "https://picsum.photos/seed/deco3/800/600", category: "Festive" },
  { title: "Sacred Decoration", theme: "Traditional", haar_style: "Mixed Flowers", image_url: "https://picsum.photos/seed/deco4/800/600", category: "Theme-based" },
  { title: "Devotional Theme", theme: "Nature", haar_style: "Lotus Petals", image_url: "https://picsum.photos/seed/deco5/800/600", category: "Spiritual" },
  { title: "Divine Aura", theme: "Traditional", haar_style: "Sandalwood Garland", image_url: "https://picsum.photos/seed/deco6/800/600", category: "Traditional" },
  { title: "Sacred Space", theme: "Peaceful", haar_style: "Marigold Mix", image_url: "https://picsum.photos/seed/deco7/800/600", category: "Aesthetic" },
  { title: "Guruhari Padhramni", theme: "Royal", haar_style: "Velvet & Gold", image_url: "https://picsum.photos/seed/deco8/800/600", category: "Festive" },
  { title: "Devotional Arrangement", theme: "Theme-based", haar_style: "Peacock Feathers", image_url: "https://picsum.photos/seed/deco9/800/600", category: "Theme-based" },
  { title: "Divine Presence", theme: "Spiritual", haar_style: "Fresh Jasmine", image_url: "https://picsum.photos/seed/deco10/800/600", category: "Spiritual" },
  { title: "Sacred Vibe", theme: "Peaceful", haar_style: "Rose Petals", image_url: "https://picsum.photos/seed/deco11/800/600", category: "Aesthetic" },
  { title: "Floral Elegance", theme: "Traditional", haar_style: "Rose & Jasmine", image_url: "https://picsum.photos/seed/deco12/800/600", category: "Festive" },
  { title: "Royal Gold", theme: "Royal", haar_style: "Gold Plated", image_url: "https://picsum.photos/seed/deco13/800/600", category: "Aesthetic" },
  { title: "Divine White", theme: "Peaceful", haar_style: "White Lily", image_url: "https://picsum.photos/seed/deco14/800/600", category: "Spiritual" },
  { title: "My Sacred Smruti 1", theme: "Divine", haar_style: "Personal Choice", image_url: "https://pub-1407f82391df4ab1951418d04be76914.r2.dev/uploads/97f0b88a-79eb-4a98-9425-bcbe98094584.jpeg", category: "Traditional" },
  { title: "My Sacred Smruti 2", theme: "Divine", haar_style: "Special Arrangement", image_url: "https://pub-1407f82391df4ab1951418d04be76914.r2.dev/uploads/c9ab588b-7a2e-41b2-9a8b-14c40f2cd205.png", category: "Traditional" },
  { title: "My Sacred Smruti 3", theme: "Spiritual", haar_style: "Royal Garland", image_url: "https://pub-1407f82391df4ab1951418d04be76914.r2.dev/uploads/97f0b88a-79eb-4a98-9425-bcbe98094584.jpeg", category: "Traditional" },
  { title: "My Sacred Smruti 4", theme: "Festive", haar_style: "Traditional Arch", image_url: "https://pub-1407f82391df4ab1951418d04be76914.r2.dev/uploads/d98616bf-2d20-47ab-845d-c6b63596bafa.jpeg", category: "Festive" },
  { title: "My Sacred Smruti 5", theme: "Aesthetic", haar_style: "Modern Setup", image_url: "https://pub-1407f82391df4ab1951418d04be76914.r2.dev/uploads/5d2a9cb4-73a4-4577-aad7-3ae9dfd3b05b.png", category: "Aesthetic" },
  { title: "My Sacred Smruti 6", theme: "Divine", haar_style: "Floral Design", image_url: "https://pub-1407f82391df4ab1951418d04be76914.r2.dev/uploads/a419f186-6c3d-4956-bae2-a0fcc6b99cd2.png", category: "Festive" },
  { title: "My Sacred Smruti 7", theme: "Spiritual", haar_style: "Traditional Design", image_url: "https://pub-1407f82391df4ab1951418d04be76914.r2.dev/uploads/a8349505-657d-4539-8909-7b777efd5f7b.png", category: "Traditional" },
];

const seedUsers = [
  { name: "Hari Anand", email: "hari@example.com", password: "password123", bio: "Devotional seeker and decorator.", profile_image: "https://ui-avatars.com/api/?name=Hari+Anand&background=f59e0b&color=fff" },
  { name: "Admin", email: "admin@example.com", password: "adminpassword", bio: "System administrator.", profile_image: "https://ui-avatars.com/api/?name=Admin&background=1f2937&color=fff" }
];

const seed = async () => {
    // Seed decorations (clear first to update URLs)
    db.prepare("DELETE FROM decorations").run();
    const insertDeco = db.prepare("INSERT INTO decorations (title, theme, haar_style, image_url, category) VALUES (?, ?, ?, ?, ?)");
    seedDecorations.forEach(d => insertDeco.run(d.title, d.theme, d.haar_style, d.image_url, d.category));

    // Seed users if empty
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    if (userCount.count === 0) {
        console.log("Seeding users...");
        const insertUser = db.prepare("INSERT INTO users (name, email, password, bio, profile_image) VALUES (?, ?, ?, ?, ?)");
        for (const u of seedUsers) {
            const hashedPassword = await bcrypt.hash(u.password, 10);
            insertUser.run(u.name, u.email, hashedPassword, u.bio, u.profile_image);
        }
        console.log("Users seeded successfully.");
    }
};
seed();

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// API Routes
app.get("/", (req, res) => {
    res.send("Backend server is running successfully!");
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const result = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)").run(name, email, hashedPassword);
    const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET);
    res.json({ token, user: { id: result.lastInsertRowid, name, email } });
  } catch (e) {
    res.status(400).json({ error: "Email already exists" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, bio: user.bio, profile_image: user.profile_image } });
});

app.get("/api/users", (req, res) => {
  const users = db.prepare("SELECT id, name, email, bio, profile_image FROM users").all();
  res.json(users);
});

app.get("/api/user/profile", authenticateToken, (req: any, res) => {
  const user = db.prepare("SELECT id, name, email, bio, profile_image FROM users WHERE id = ?").get(req.user.id);
  res.json(user);
});

app.put("/api/user/profile", authenticateToken, (req: any, res) => {
  const { name, email, bio, profile_image } = req.body;
  db.prepare("UPDATE users SET name = ?, email = ?, bio = ?, profile_image = ? WHERE id = ?").run(name, email, bio, profile_image, req.user.id);
  res.json({ success: true });
});

app.get("/api/decorations", (req, res) => {
  const { search, category } = req.query;
  let query = "SELECT * FROM decorations";
  const params: any[] = [];
  if (search || category) {
    query += " WHERE";
    if (search) {
      query += " (title LIKE ? OR theme LIKE ? OR haar_style LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) {
      if (search) query += " AND";
      query += " category = ?";
      params.push(category);
    }
  }
  query += " ORDER BY id DESC";
  const decorations = db.prepare(query).all(...params);
  res.json(decorations);
});

app.post("/api/decorations", authenticateToken, (req: any, res) => {
  const { title, theme, haar_style, image_url, category } = req.body;
  if (!title || !theme || !haar_style || !image_url || !category) {
    return res.status(400).json({ error: "All fields are required" });
  }
  try {
    const result = db.prepare("INSERT INTO decorations (title, theme, haar_style, image_url, category, user_id) VALUES (?, ?, ?, ?, ?, ?)")
      .run(title, theme, haar_style, image_url, category, req.user.id);
    res.json({ id: result.lastInsertRowid, title, theme, haar_style, image_url, category });
  } catch (e) {
    res.status(500).json({ error: "Failed to post decoration" });
  }
});

app.post("/api/user/save-image", authenticateToken, (req: any, res) => {
  const { decoration_id } = req.body;
  try {
    db.prepare("INSERT OR IGNORE INTO saved_images (user_id, decoration_id) VALUES (?, ?)").run(req.user.id, decoration_id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to save image" });
  }
});

app.delete("/api/user/save-image/:id", authenticateToken, (req: any, res) => {
  db.prepare("DELETE FROM saved_images WHERE user_id = ? AND decoration_id = ?").run(req.user.id, req.params.id);
  res.json({ success: true });
});

app.get("/api/user/saved-images", authenticateToken, (req: any, res) => {
  const saved = db.prepare(`
    SELECT d.* FROM decorations d
    JOIN saved_images s ON d.id = s.decoration_id
    WHERE s.user_id = ?
  `).all(req.user.id);
  res.json(saved);
});

// Timeline Generator API
app.post("/api/timeline/generate", authenticateToken, async (req: any, res) => {
  const { eventDate, eventType } = req.body;
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const prompt = `Generate a detailed preparation timeline for a Guruhari Padhramni event on ${eventDate}. The theme is ${eventType}. 
    Provide a list of tasks with recommended days before the event (e.g., "7 days before", "1 day before", "On the day"). 
    Format the output as a JSON array of objects with 'day' and 'task' properties.`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    } as any);

    const tasks = JSON.parse(response.text || "[]");
    db.prepare("INSERT INTO timelines (user_id, event_date, tasks) VALUES (?, ?, ?)").run(req.user.id, eventDate, JSON.stringify(tasks));
    res.json(tasks);
  } catch (e) {
    const fallback = [
      { day: "7 days before", task: "Finalize decoration theme and order materials." },
      { day: "5 days before", task: "Invite guests and volunteers." },
      { day: "3 days before", task: "Clean the padhramni area and check lighting." },
      { day: "1 day before", task: "Prepare the haar and floral arrangements." },
      { day: "On the day", task: "Final setup and welcoming of Guruhari." }
    ];
    res.json(fallback);
  }
});

app.get("/api/user/timelines", authenticateToken, (req: any, res) => {
  const timelines = db.prepare("SELECT * FROM timelines WHERE user_id = ? ORDER BY id DESC").all(req.user.id);
  res.json(timelines.map((t: any) => ({ ...t, tasks: JSON.parse(t.tasks) })));
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});