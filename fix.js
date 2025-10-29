use Librería
var libros = db.books.find().toArray()
print('Libros encontrados: ' + libros.length)

use catalogdb
db.books.deleteMany({})
db.books.insertMany(libros)
print('Migrados a catalogdb: ' + libros.length)

use Librería
db.dropDatabase()
print('Librería eliminada')

use books
db.dropDatabase()
print('books eliminada')

use catalogdb
print('FINAL: ' + db.books.countDocuments() + ' libros en catalogdb')
