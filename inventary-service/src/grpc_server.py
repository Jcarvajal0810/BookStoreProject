import grpc
from concurrent import futures
import time
from datetime import datetime
import os
from pymongo import MongoClient

import inventory_pb2
import inventory_pb2_grpc

GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RED = "\033[91m"
RESET = "\033[0m"

def log_event(color, emoji, message):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"{color}[{now}] {emoji} {message}{RESET}")

MONGO_URI = os.getenv('MONGO_URI', 'mongodb+srv://Jcarvajal0810:Nutella_0810@sharedm0.d3q2w0n.mongodb.net/inventorydb?retryWrites=true&w=majority&appName=SharedM0')

try:
    mongo_client = MongoClient(MONGO_URI)
    db = mongo_client['inventorydb']
    inventory_collection = db['inventory']
    mongo_client.admin.command('ping')
    log_event(GREEN, "✅", f"Conectado a MongoDB Atlas (inventorydb)")
except Exception as e:
    log_event(RED, "❌", f"Error conectando a MongoDB: {str(e)}")
    exit(1)

class InventoryServiceServicer(inventory_pb2_grpc.InventoryServiceServicer):
    
    def CheckStock(self, request, context):
        book_id = request.book_id
        
        try:
            inventory_item = inventory_collection.find_one({"book_id": book_id})
            
            if inventory_item:
                available_units = inventory_item.get('stock', 0)
                in_stock = available_units > 0
                log_event(GREEN, "🟢", f"CheckStock(book_id={book_id}) → {available_units} unidades")
            else:
                from bson.objectid import ObjectId
                try:
                    inventory_item = inventory_collection.find_one({"_id": ObjectId(book_id)})
                    if inventory_item:
                        available_units = inventory_item.get('stock', 0)
                        in_stock = available_units > 0
                        log_event(GREEN, "🟢", f"CheckStock(_id={book_id}) → {available_units} unidades")
                    else:
                        available_units = 0
                        in_stock = False
                        log_event(YELLOW, "⚠️", f"CheckStock({book_id}) → NO encontrado")
                except:
                    available_units = 0
                    in_stock = False
                    log_event(YELLOW, "⚠️", f"CheckStock({book_id}) → NO encontrado")
            
            return inventory_pb2.StockResponse(
                book_id=book_id,
                available_units=available_units,
                in_stock=in_stock
            )
        except Exception as e:
            log_event(RED, "🔴", f"Error en CheckStock: {str(e)}")
            return inventory_pb2.StockResponse(
                book_id=book_id,
                available_units=0,
                in_stock=False
            )

    def ReserveStock(self, request, context):
        book_id = request.book_id
        quantity = request.quantity

        try:
            inventory_item = inventory_collection.find_one({"book_id": book_id})
            
            if not inventory_item:
                from bson.objectid import ObjectId
                try:
                    inventory_item = inventory_collection.find_one({"_id": ObjectId(book_id)})
                except:
                    pass
            
            if not inventory_item:
                log_event(RED, "🔴", f"ReserveStock({book_id}) → NO encontrado")
                return inventory_pb2.ReserveResponse(
                    success=False,
                    message=f"Libro {book_id} no encontrado"
                )
            
            current_stock = inventory_item.get('stock', 0)
            
            if current_stock >= quantity:
                new_stock = current_stock - quantity
                
                if 'book_id' in inventory_item:
                    inventory_collection.update_one(
                        {"book_id": book_id},
                        {"$set": {"stock": new_stock}}
                    )
                else:
                    inventory_collection.update_one(
                        {"_id": inventory_item['_id']},
                        {"$set": {"stock": new_stock}}
                    )
                
                log_event(YELLOW, "🟡", f"ReserveStock({book_id}, {quantity}) → OK ({current_stock} → {new_stock})")
                return inventory_pb2.ReserveResponse(
                    success=True,
                    message=f"Reservadas {quantity} unidades"
                )
            else:
                log_event(RED, "🔴", f"ReserveStock({book_id}, {quantity}) → Stock insuficiente ({current_stock})")
                return inventory_pb2.ReserveResponse(
                    success=False,
                    message=f"Stock insuficiente. Disponibles: {current_stock}"
                )
        except Exception as e:
            log_event(RED, "🔴", f"Error en ReserveStock: {str(e)}")
            return inventory_pb2.ReserveResponse(
                success=False,
                message=f"Error: {str(e)}"
            )

    def ReleaseStock(self, request, context):
        """🆕 Liberar stock cuando el pago falla"""
        book_id = request.book_id
        quantity = request.quantity

        try:
            inventory_item = inventory_collection.find_one({"book_id": book_id})
            
            if not inventory_item:
                from bson.objectid import ObjectId
                try:
                    inventory_item = inventory_collection.find_one({"_id": ObjectId(book_id)})
                except:
                    pass
            
            if not inventory_item:
                log_event(RED, "🔴", f"ReleaseStock({book_id}) → NO encontrado")
                return inventory_pb2.ReleaseResponse(
                    success=False,
                    message=f"Libro {book_id} no encontrado"
                )
            
            current_stock = inventory_item.get('stock', 0)
            new_stock = current_stock + quantity
            
            if 'book_id' in inventory_item:
                inventory_collection.update_one(
                    {"book_id": book_id},
                    {"$set": {"stock": new_stock}}
                )
            else:
                inventory_collection.update_one(
                    {"_id": inventory_item['_id']},
                    {"$set": {"stock": new_stock}}
                )
            
            log_event(BLUE, "🔵", f"ReleaseStock({book_id}, {quantity}) → OK ({current_stock} → {new_stock})")
            return inventory_pb2.ReleaseResponse(
                success=True,
                message=f"Liberadas {quantity} unidades"
            )
        except Exception as e:
            log_event(RED, "🔴", f"Error en ReleaseStock: {str(e)}")
            return inventory_pb2.ReleaseResponse(
                success=False,
                message=f"Error: {str(e)}"
            )

    def ConfirmStockReduction(self, request, context):
        book_id = request.book_id
        quantity = request.quantity

        try:
            inventory_item = inventory_collection.find_one({"book_id": book_id})
            
            if not inventory_item:
                from bson.objectid import ObjectId
                try:
                    inventory_item = inventory_collection.find_one({"_id": ObjectId(book_id)})
                except:
                    pass
            
            if inventory_item:
                log_event(BLUE, "🔵", f"ConfirmStockReduction({book_id}, {quantity}) → confirmado")
                return inventory_pb2.ConfirmResponse(
                    confirmed=True,
                    message=f"Stock confirmado para {book_id}"
                )
            else:
                log_event(RED, "🔴", f"ConfirmStockReduction({book_id}) → NO encontrado")
                return inventory_pb2.ConfirmResponse(
                    confirmed=False,
                    message=f"Libro {book_id} no existe"
                )
        except Exception as e:
            log_event(RED, "🔴", f"Error en ConfirmStockReduction: {str(e)}")
            return inventory_pb2.ConfirmResponse(
                confirmed=False,
                message=f"Error: {str(e)}"
            )

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    inventory_pb2_grpc.add_InventoryServiceServicer_to_server(InventoryServiceServicer(), server)
    server.add_insecure_port("[::]:50051")
    log_event(GREEN, "🚀", "Inventory gRPC server en puerto 50051")
    log_event(BLUE, "📊", "Esperando peticiones...")
    server.start()
    try:
        while True:
            time.sleep(86400)
    except KeyboardInterrupt:
        log_event(RED, "🛑", "Apagando servidor...")
        server.stop(0)

if __name__ == "__main__":
    serve()