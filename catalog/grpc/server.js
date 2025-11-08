import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Book from "../models/book.js"; // Modelo real

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar proto
const PROTO_PATH = join(__dirname, "proto", "catalog.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const catalogProto = grpc.loadPackageDefinition(packageDefinition).catalog;

// Métodos
async function getBookDetails(call, callback) {
  try {
    const book = await Book.findById(call.request.book_id);
    if (!book)
      return callback({ code: grpc.status.NOT_FOUND, message: "Libro no encontrado" });

    callback(null, {
      book_id: book._id.toString(),
      title: book.name,
      author: book.author || "Desconocido",
      price: book.price,
      available: book.countInStock > 0,
      stock: book.countInStock,
    });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

async function validatePrice(call, callback) {
  try {
    const book = await Book.findById(call.request.book_id);
    if (!book)
      return callback({ code: grpc.status.NOT_FOUND, message: "Libro no encontrado" });

    callback(null, { price: book.price, currency: "USD" });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

async function validateBooks(call, callback) {
  try {
    const results = await Promise.all(
      call.request.books.map(async (b) => {
        const book = await Book.findById(b.book_id);
        if (!book)
          return {
            book_id: b.book_id,
            exists: false,
            current_price: 0,
            price_changed: false,
            in_stock: false,
          };

        return {
          book_id: b.book_id,
          exists: true,
          current_price: book.price,
          price_changed: book.price !== b.expected_price,
          in_stock: book.countInStock > 0,
        };
      })
    );

    callback(null, { validations: results });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

// Exportar servidor
export function startGrpcServer() {
  const server = new grpc.Server();

  server.addService(catalogProto.CatalogService.service, {
    GetBookDetails: getBookDetails,
    ValidatePrice: validatePrice,
    ValidateBooks: validateBooks,
  });

  const PORT = process.env.GRPC_PORT || "50054";

  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), () => {
    console.log(`✅ gRPC CatalogService escuchando en puerto ${PORT}`);
  });
}
