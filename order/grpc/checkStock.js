const InventoryClient = require("./inventoryClient");

(async () => {
  const client = new InventoryClient();
  const bookId = process.argv[2]; // Pasamos el book_id como argumento

  try {
    const stock = await client.checkStock(bookId);
    console.log(JSON.stringify(stock)); // Devuelve JSON para PowerShell
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
