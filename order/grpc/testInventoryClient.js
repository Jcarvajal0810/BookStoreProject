const InventoryClient = require('./inventoryClient');
const client = new InventoryClient();

async function test() {
  try {
    const stock = await client.checkStock('book_1');
    console.log('Stock book_1:', stock.available_units);

    const reserve = await client.reserveStock('book_2', 2);
    console.log('Reserva book_2:', reserve.message);

    const confirm = await client.confirmStock('book_3', 1);
    console.log('Confirmación book_3:', confirm.message);
  } catch (err) {
    console.error('Error gRPC:', err);
  }
}

test();
