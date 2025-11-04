import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ====== MODELO DE LIBRO (reutilizar del index.js) ======
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

const Book = mongoose.model('Book', bookSchema);

// ====== CARGAR PROTO ======
const PROTO_PATH = join(__dirname, 'proto', 'catalog.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const catalogProto = grpc.loadPackageDefinition(packageDefinition).catalog;

// ====== MÉTODOS gRPC ======

/**
 * GetBookDetails - Obtener detalles completos de un libro
 */
async function getBookDetails(call, callback) {
  try {
    const { book_id } = call.request;
    console.log(`[gRPC Catalog] GetBookDetails para book_id: ${book_id}`);

    if (!mongoose.Types.ObjectId.isValid(book_id)) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'book_id no es un ObjectId válido'
      });
    }

    const book = await Book.findById(book_id);

    if (!book) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `Libro con ID ${book_id} no encontrado`
      });
    }

    const response = {
      book_id: book._id.toString(),
      title: book.name,
      author: book.author || 'Desconocido',
      price: book.price,
      available: book.countInStock > 0,
      stock: book.countInStock
    };

    console.log(`[gRPC Catalog]  Libro encontrado: ${book.name}`);
    callback(null, response);

  } catch (error) {
    console.error('[gRPC Catalog]  Error en GetBookDetails:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
}

/**
 * ValidatePrice - Validar precio de un libro
 */
async function validatePrice(call, callback) {
  try {
    const { book_id } = call.request;
    console.log(`[gRPC Catalog] ValidatePrice para book_id: ${book_id}`);

    if (!mongoose.Types.ObjectId.isValid(book_id)) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'book_id no es un ObjectId válido'
      });
    }

    const book = await Book.findById(book_id);

    if (!book) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `Libro con ID ${book_id} no encontrado`
      });
    }

    callback(null, {
      price: book.price,
      currency: 'USD'
    });

    console.log(`[gRPC Catalog]  Precio: $${book.price}`);

  } catch (error) {
    console.error('[gRPC Catalog]  Error en ValidatePrice:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
}

/**
 * ValidateBooks - Validar múltiples libros (para cart-service)
 */
async function validateBooks(call, callback) {
  try {
    const { books } = call.request;
    console.log(`[gRPC Catalog] ValidateBooks para ${books.length} libros`);

    const validations = [];

    for (const item of books) {
      const { book_id, expected_price } = item;

      if (!mongoose.Types.ObjectId.isValid(book_id)) {
        validations.push({
          book_id: book_id,
          exists: false,
          current_price: 0,
          price_changed: false,
          in_stock: false
        });
        continue;
      }

      const book = await Book.findById(book_id);

      if (!book) {
        validations.push({
          book_id: book_id,
          exists: false,
          current_price: 0,
          price_changed: false,
          in_stock: false
        });
        continue;
      }

      validations.push({
        book_id: book_id,
        exists: true,
        current_price: book.price,
        price_changed: Math.abs(book.price - expected_price) > 0.01,
        in_stock: book.countInStock > 0
      });

      console.log(`    ${book.name}: $${book.price} (stock: ${book.countInStock})`);
    }

    console.log(`[gRPC Catalog]  Validados ${validations.length} libros`);
    callback(null, { validations });

  } catch (error) {
    console.error('[gRPC Catalog]  Error en ValidateBooks:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
}

// ====== INICIAR SERVIDOR gRPC ======
export function startGrpcServer() {
  const server = new grpc.Server();

  server.addService(catalogProto.CatalogService.service, {
    GetBookDetails: getBookDetails,
    ValidatePrice: validatePrice,
    ValidateBooks: validateBooks
  });

  const GRPC_PORT = process.env.GRPC_PORT || '50054';
  const address = `0.0.0.0:${GRPC_PORT}`;

  server.bindAsync(
    address,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error(' Error iniciando servidor gRPC CatalogService:', err);
        process.exit(1);
      }
      console.log(` Servidor gRPC CatalogService escuchando en puerto ${port}`);
    }
  );
}