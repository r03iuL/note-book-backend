const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb"); // ✅ Added ObjectId

dotenv.config();

const app = express();

// middleware
app.use(cors());
app.use(express.json());

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

app.get("/", (req, res) => {
  res.send("Notes API is running...");
});

// get all notes
app.get("/notes", async (req, res) => {
  try {
    const notes = await notesCollection.find({}).toArray();
    res.status(200).json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ message: "Failed to fetch notes" });
  }
});

// ✅ get note by id
app.get("/notes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const note = await notesCollection.findOne({ _id: new ObjectId(id) });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.status(200).json(note);
  } catch (error) {
    console.error("Error fetching note by ID:", error);
    res.status(400).json({ message: "Invalid note ID" });
  }
});

// get all folders
app.get("/folders", async (req, res) => {
  try {
    const folders = await folderCollection.find({}).toArray();
    res.status(200).json(folders);
  } catch (error) {
    console.error("Error fetching folders:", error);
    res.status(500).json({ message: "Failed to fetch folders" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
