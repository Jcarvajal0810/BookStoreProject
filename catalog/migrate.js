import mongoose from "mongoose";

const sourceUri = "mongodb+srv://Jcarvajal0810:Nutella_0810@sharedm0.d3q2w0n.mongodb.net/BookStore?retryWrites=true&w=majority";
const targetUri = "mongodb+srv://Jcarvajal0810:Nutella_0810@sharedm0.d3q2w0n.mongodb.net/catalogdb?retryWrites=true&w=majority";

async function migrate() {
  try {
    // Conectar a BookStore
    console.log("Conectando a BookStore...");
    const sourceConn = await mongoose.createConnection(sourceUri).asPromise();
    const SourceBook = sourceConn.model("Book", new mongoose.Schema({}, { strict: false, collection: "books" }));
    
    // Obtener todos los libros
    const libros = await SourceBook.find({}).lean();
    console.log(`Libros encontrados en BookStore: ${libros.length}`);
    
    if (libros.length === 0) {
      console.log("ERROR: No hay libros en BookStore.books");
      process.exit(1);
    }
    
    // Conectar a catalogdb
    console.log("Conectando a catalogdb...");
    const targetConn = await mongoose.createConnection(targetUri).asPromise();
    const TargetBook = targetConn.model("Book", new mongoose.Schema({}, { strict: false, collection: "books" }));
    
    // Limpiar catalogdb.books
    await TargetBook.deleteMany({});
    console.log("catalogdb.books limpiado");
    
    // Insertar libros en catalogdb
    await TargetBook.insertMany(libros);
    const count = await TargetBook.countDocuments();
    console.log(`SUCCESS: ${count} libros migrados a catalogdb.books`);
    
    await sourceConn.close();
    await targetConn.close();
    process.exit(0);
  } catch (error) {
    console.error("ERROR:", error.message);
    process.exit(1);
  }
}

migrate();