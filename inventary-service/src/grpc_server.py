import grpc
from concurrent import futures
import time
from datetime import datetime

# Importa los archivos generados del proto
import inventory_pb2
import inventory_pb2_grpc

# 🎨 Colores para la consola
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RED = "\033[91m"
RESET = "\033[0m"

def log_event(color, emoji, message):
    """Imprime logs bonitos con hora"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"{color}[{now}] {emoji} {message}{RESET}")

# Implementación del servicio definido en inventory.proto
class InventoryServiceServicer(inventory_pb2_grpc.InventoryServiceServicer):
    def __init__(self):
        self.inventory = {
            "book_1": 10,
            "book_2": 5,
            "book_3": 0,
        }

    def CheckStock(self, request, context):
        book_id = request.book_id
        available_units = self.inventory.get(book_id, 0)
        in_stock = available_units > 0

        log_event(GREEN, "🟢", f"CheckStock(book_id={book_id}) → disponible={available_units}, en_stock={in_stock}")

        return inventory_pb2.StockResponse(
            book_id=book_id,
            available_units=available_units,
            in_stock=in_stock
        )

    def ReserveStock(self, request, context):
        book_id = request.book_id
        quantity = request.quantity

        if self.inventory.get(book_id, 0) >= quantity:
            self.inventory[book_id] -= quantity
            log_event(YELLOW, "🟡", f"ReserveStock(book_id={book_id}, cantidad={quantity}) → OK")
            return inventory_pb2.ReserveResponse(
                success=True,
                message=f"Reservadas {quantity} unidades de {book_id}"
            )
        else:
            log_event(RED, "🔴", f"ReserveStock(book_id={book_id}, cantidad={quantity}) → Stock insuficiente")
            return inventory_pb2.ReserveResponse(
                success=False,
                message=f"No hay stock suficiente para {book_id}"
            )

    def ConfirmStockReduction(self, request, context):
        book_id = request.book_id
        quantity = request.quantity

        if book_id in self.inventory:
            log_event(BLUE, "🔵", f"ConfirmStockReduction(book_id={book_id}, cantidad={quantity}) → confirmado")
            return inventory_pb2.ConfirmResponse(
                confirmed=True,
                message=f"Stock confirmado para {book_id}, cantidad: {quantity}"
            )
        else:
            log_event(RED, "🔴", f"ConfirmStockReduction(book_id={book_id}) → libro no encontrado")
            return inventory_pb2.ConfirmResponse(
                confirmed=False,
                message=f"El libro {book_id} no existe"
            )

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    inventory_pb2_grpc.add_InventoryServiceServicer_to_server(InventoryServiceServicer(), server)
    server.add_insecure_port("[::]:50051")
    log_event(GREEN, "🚀", "Inventory gRPC server corriendo en el puerto 50051")
    server.start()
    try:
        while True:
            time.sleep(86400)
    except KeyboardInterrupt:
        log_event(RED, "🛑", "Apagando servidor gRPC...")
        server.stop(0)

if __name__ == "__main__":
    serve()
