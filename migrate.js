use BookStore
var libros = db.books.find().toArray()
print('Libros en BookStore: ' + libros.length)

use catalogdb
db.books.deleteMany({})
db.books.insertMany(libros)
print('Migrados a catalogdb: ' + db.books.countDocuments())
