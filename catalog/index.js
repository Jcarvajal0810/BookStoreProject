import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { startGrpcServer } from "./grpc/server.js"; // ← NUEVO
import Book from "./models/book.js"; // ← NUEVO: modelo separado

const app = express();
app.use(cors());
app.use(express.json());

// === Conexión a MongoDB Atlas ===
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error(" ERROR: debes definir MONGO_URI en .env");
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log(" Conectado a MongoDB Atlas (catalogdb)");
    try {
      const dbName = mongoose.connection.db && mongoose.connection.db.databaseName;
      console.log(` Base de datos: ${dbName || "desconocida"}`);
    } catch (e) {}

    // ====== INICIAR SERVIDOR gRPC ======
    startGrpcServer(); // ← NUEVO
  })
  .catch((err) => {
    console.error(" Error conectando a MongoDB Atlas:", err.message || err);
    process.exit(1);
  });

// === RUTAS REST (Norte-Sur) ===

// 1) Buscar por título
app.get("/api/books/search", async (req, res) => {
  try {
    const q = (req.query.title || "").trim();
    if (!q) return res.status(400).json({ error: "Debes enviar query ?title=..." });

    const results = await Book.find({ name: { $regex: q, $options: "i" } });
    if (!results.length) return res.status(404).json({ error: "No se encontraron libros" });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2) Buscar por autor
app.get("/api/books/author/:author", async (req, res) => {
  try {
    const author = req.params.author;
    const results = await Book.find({ author: author });
    if (!results.length)
      return res.status(404).json({ error: "No se encontraron libros para ese autor" });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3) Obtener todos
app.get("/api/books", async (req, res) => {
  try {
    const all = await Book.find();
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4) Obtener por ID
app.get("/api/books/:id", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Libro no encontrado" });
    res.json(book);
  } catch (err) {
    res.status(400).json({ error: "ID inválido" });
  }
});

// 5) Crear libro
app.post("/api/books", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.name || payload.price === undefined) {
      return res.status(400).json({ error: "Faltan campos: name y price" });
    }
    const newBook = new Book(payload);
    await newBook.save();
    res.status(201).json(newBook);
  } catch (err) {
    res.status(400).json({ error: "Error creando libro", details: err.message });
  }
});

// 6) Actualizar completo
app.put("/api/books/:id", async (req, res) => {
  try {
    const updated = await Book.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ error: "Libro no encontrado" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "ID inválido o datos incorrectos", details: err.message });
  }
});

// 7) Actualizar solo stock
app.patch("/api/books/:id/stock", async (req, res) => {
  try {
    if (req.body.countInStock === undefined)
      return res.status(400).json({ error: "Falta countInStock" });
    const updated = await Book.findByIdAndUpdate(
      req.params.id,
      { countInStock: req.body.countInStock },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: "Libro no encontrado" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "ID inválido", details: err.message });
  }
});

// 8) Eliminar libro
app.delete("/api/books/:id", async (req, res) => {
  try {
    const deleted = await Book.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Libro no encontrado" });
    res.json({ deleted: deleted._id.toString() });
  } catch (err) {
    res.status(400).json({ error: "ID inválido" });
  }
});

// === Start server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(` Catalog Service iniciado`);
  console.log("=".repeat(60));
  console.log(` REST API: http://${process.env.HOST || '0.0.0.0'}:${PORT}`);

  console.log(` gRPC Server: puerto ${process.env.GRPC_PORT || 50054}`);
  console.log("=".repeat(60) + "\n");
});
