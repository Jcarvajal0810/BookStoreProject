import grpc
import inventory_pb2
import inventory_pb2_grpc

def test_check_stock():
    # Conexión al servidor gRPC
    channel = grpc.insecure_channel('inventory-grpc:50051')
    stub = inventory_pb2_grpc.InventoryServiceStub(channel)

    # Llamada al método CheckStock
    print("🧪 Probando CheckStock...")
    response = stub.CheckStock(inventory_pb2.StockRequest(book_id="book_1"))
    print(f"✅ Respuesta del servidor: {response}")

def test_reserve_stock():
    channel = grpc.insecure_channel('inventory-grpc:50051')

    stub = inventory_pb2_grpc.InventoryServiceStub(channel)

    print("🧪 Probando ReserveStock...")
    response = stub.ReserveStock(inventory_pb2.ReserveRequest(book_id="book_2", quantity=2))
    print(f"✅ Respuesta del servidor: {response}")

def test_confirm_stock():
    channel = grpc.insecure_channel('inventory-grpc:50051')

    stub = inventory_pb2_grpc.InventoryServiceStub(channel)

    print("🧪 Probando ConfirmStockReduction...")
    response = stub.ConfirmStockReduction(inventory_pb2.ConfirmRequest(book_id="book_3", quantity=1))
    print(f"✅ Respuesta del servidor: {response}")

if __name__ == "__main__":
    test_check_stock()
    test_reserve_stock()
    test_confirm_stock()
