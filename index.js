const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");

dotenv.config();

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// Firebase Admin SDK
const serviceAccount = require("./firebase-service-account.json"); // Download from Firebase console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// MongoDB setup
const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("❌ Missing MONGO_URI in .env file");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let notesCollection;
let folderCollection;

async function run() {
  try {
    await client.connect();
    const database = client.db("note-book");
    notesCollection = database.collection("notes");
    folderCollection = database.collection("folders");

    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
  }
}
run().catch(console.dir);

// --- Firebase auth middleware ---
async function authenticateFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "Unauthorized" });

  const idToken = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // contains uid, email, etc.
    next();
  } catch (error) {
    console.error("Firebase auth error:", error);
    res.status(403).json({ message: "Invalid token" });
  }
}

// --- Routes ---

app.get("/", (req, res) => {
  res.send("Notes API is running...");
});

// --- Notes Routes ---
app.post("/notes", authenticateFirebaseToken, async (req, res) => {
  try {
    const note = { ...req.body, userId: req.user.uid }; // attach Firebase UID
    const result = await notesCollection.insertOne(note);
    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).json({ message: "Failed to create note" });
  }
});

app.get("/notes", authenticateFirebaseToken, async (req, res) => {
  try {
    const notes = await notesCollection.find({ userId: req.user.uid }).toArray();
    res.status(200).json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ message: "Failed to fetch notes" });
  }
});

app.get("/notes/:id", authenticateFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const note = await notesCollection.findOne({ _id: new ObjectId(id), userId: req.user.uid });

    if (!note) return res.status(404).json({ message: "Note not found" });

    res.status(200).json(note);
  } catch (error) {
    console.error("Error fetching note by ID:", error);
    res.status(400).json({ message: "Invalid note ID" });
  }
});

app.put("/notes/:id", authenticateFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const result = await notesCollection.updateOne(
      { _id: new ObjectId(id), userId: req.user.uid },
      { $set: update }
    );

    if (!result.matchedCount) return res.status(404).json({ message: "Note not found" });

    res.json({ message: "Note updated successfully" });
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ message: "Failed to update note" });
  }
});

app.delete("/notes/:id", authenticateFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await notesCollection.deleteOne({ _id: new ObjectId(id), userId: req.user.uid });

    if (!result.deletedCount) return res.status(404).json({ message: "Note not found" });

    res.json({ message: "Note deleted" });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ message: "Failed to delete note" });
  }
});

// --- Folders Routes ---
app.post("/folders", authenticateFirebaseToken, async (req, res) => {
  try {
    const folder = { ...req.body, userId: req.user.uid };
    const result = await folderCollection.insertOne(folder);
    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({ message: "Failed to create folder" });
  }
});

app.get("/folders", authenticateFirebaseToken, async (req, res) => {
  try {
    const folders = await folderCollection.find({ userId: req.user.uid }).toArray();
    res.status(200).json(folders);
  } catch (error) {
    console.error("Error fetching folders:", error);
    res.status(500).json({ message: "Failed to fetch folders" });
  }
});

// optional: get folder by ID
app.get("/folders/:id", authenticateFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await folderCollection.findOne({ _id: new ObjectId(id), userId: req.user.uid });

    if (!folder) return res.status(404).json({ message: "Folder not found" });

    res.status(200).json(folder);
  } catch (error) {
    console.error("Error fetching folder by ID:", error);
    res.status(400).json({ message: "Invalid folder ID" });
  }
});

app.delete("/folders/:id", authenticateFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await folderCollection.deleteOne({ _id: new ObjectId(id), userId: req.user.uid });

    if (!result.deletedCount) return res.status(404).json({ message: "Folder not found" });

    res.json({ message: "Folder deleted" });
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).json({ message: "Failed to delete folder" });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
