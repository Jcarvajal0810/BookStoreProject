import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// === Conexión a MongoDB Atlas (usa la variable de entorno MONGO_URI) ===
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error(" ERROR: debes definir la variable de entorno MONGO_URI apuntando a Atlas");
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log(" Conectado correctamente a MongoDB Atlas (catalogdb)");
    try {
      const dbName = mongoose.connection.db && mongoose.connection.db.databaseName;
      console.log(" Base de datos:", dbName || "desconocida");
    } catch (e) {}
  })
  .catch((err) => {
    console.error(" Error conectando a MongoDB Atlas:", err.message || err);
    process.exit(1);
  });

// === Esquema y modelo ===
const bookSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    author: { type: String },
    description: { type: String },
    image: { type: String },
    countInStock: { type: Number, default: 0 },
    price: { type: Number, required: true },
  },
  { timestamps: true }
);

const Book = mongoose.model("Book", bookSchema);

// === RUTAS (orden: específicas antes de /:id) ===

// 1) Buscar por título (query): /api/books/search?title=...
app.get("/api/books/search", async (req, res) => {
  try {
    const q = (req.query.title || "").trim();
    if (!q) return res.status(400).json({ error: "Debes enviar query ?title=..." });

    const results = await Book.find({ name: { $regex: q, $options: "i" } });
    if (!results.length) return res.status(404).json({ error: "No se encontraron libros con ese título" });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2) Buscar por autor: /api/books/author/:author
app.get("/api/books/author/:author", async (req, res) => {
  try {
    const author = req.params.author;
    const results = await Book.find({ author: author });
    if (!results.length) return res.status(404).json({ error: "No se encontraron libros para ese autor" });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3) Obtener todos: /api/books
app.get("/api/books", async (req, res) => {
  try {
    const all = await Book.find();
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4) Obtener por ID: /api/books/:id
app.get("/api/books/:id", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Libro no encontrado" });
    res.json(book);
  } catch (err) {
    res.status(400).json({ error: "ID inválido" });
  }
});

// 5) Crear libro: POST /api/books
app.post("/api/books", async (req, res) => {
  try {
    const payload = req.body;
    // validación mínima
    if (!payload.name || payload.price === undefined) {
      return res.status(400).json({ error: "Faltan campos obligatorios: name y price" });
    }
    const newBook = new Book(payload);
    await newBook.save();
    res.status(201).json(newBook);
  } catch (err) {
    res.status(400).json({ error: "Error creando el libro", details: err.message });
  }
});

// 6) Actualizar completo: PUT /api/books/:id
app.put("/api/books/:id", async (req, res) => {
  try {
    const updated = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: "Libro no encontrado para actualizar" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "ID inválido o datos incorrectos", details: err.message });
  }
});

// 7) Actualizar solo stock: PATCH /api/books/:id/stock
app.patch("/api/books/:id/stock", async (req, res) => {
  try {
    if (req.body.countInStock === undefined) return res.status(400).json({ error: "Falta countInStock en body" });
    const updated = await Book.findByIdAndUpdate(
      req.params.id,
      { countInStock: req.body.countInStock },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: "Libro no encontrado para actualizar stock" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "ID inválido", details: err.message });
  }
});

// 8) Eliminar libro: DELETE /api/books/:id
app.delete("/api/books/:id", async (req, res) => {
  try {
    const deleted = await Book.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Libro no encontrado para eliminar" });
    res.json({ deleted: deleted._id.toString() });
  } catch (err) {
    res.status(400).json({ error: "ID inválido" });
  }
});

// === Start server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(` Catalog service running on port ${PORT}`));
