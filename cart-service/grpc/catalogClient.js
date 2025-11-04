const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, 'proto', 'catalog.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const catalogProto = grpc.loadPackageDefinition(packageDefinition).catalog;

class CatalogClient {
  constructor() {
    const CATALOG_GRPC_URL = process.env.CATALOG_GRPC_URL || 'localhost:50054';
    this.client = new catalogProto.CatalogService(
      CATALOG_GRPC_URL,
      grpc.credentials.createInsecure()
    );
    console.log(` CatalogClient conectado a ${CATALOG_GRPC_URL}`);
  }

  /**
   * Obtener detalles de un libro
   */
  getBookDetails(bookId) {
    return new Promise((resolve, reject) => {
      this.client.GetBookDetails({ book_id: bookId }, (err, response) => {
        if (err) {
          console.error('[CatalogClient]  Error en GetBookDetails:', err.message);
          return reject(err);
        }
        console.log(`[CatalogClient]  Libro: ${response.title} - $${response.price}`);
        resolve(response);
      });
    });
  }

  /**
   * Validar precio de un libro
   */
  validatePrice(bookId) {
    return new Promise((resolve, reject) => {
      this.client.ValidatePrice({ book_id: bookId }, (err, response) => {
        if (err) {
          console.error('[CatalogClient]  Error en ValidatePrice:', err.message);
          return reject(err);
        }
        console.log(`[CatalogClient]  Precio validado: $${response.price}`);
        resolve(response);
      });
    });
  }

  /**
   * Validar múltiples libros
   */
  validateBooks(books) {
    return new Promise((resolve, reject) => {
      this.client.ValidateBooks({ books }, (err, response) => {
        if (err) {
          console.error('[CatalogClient]  Error en ValidateBooks:', err.message);
          return reject(err);
        }
        console.log(`[CatalogClient]  ${response.validations.length} libros validados`);
        resolve(response);
      });
    });
  }
}

module.exports = CatalogClient;