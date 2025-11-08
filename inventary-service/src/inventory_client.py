import grpc
import inventory_pb2
import inventory_pb2_grpc

class InventoryClient:
    def __init__(self, host="inventory", port=50051):
        self.channel = grpc.insecure_channel(f"{host}:{port}")
        self.stub = inventory_pb2_grpc.InventoryServiceStub(self.channel)

    def check_stock(self, book_id):
        return self.stub.CheckStock(inventory_pb2.StockRequest(book_id=book_id))

    def reserve_stock(self, book_id, quantity):
        return self.stub.ReserveStock(inventory_pb2.ReserveRequest(book_id=book_id, quantity=quantity))

    def confirm_stock(self, book_id, quantity):
        return self.stub.ConfirmStockReduction(inventory_pb2.ConfirmRequest(book_id=book_id, quantity=quantity))
