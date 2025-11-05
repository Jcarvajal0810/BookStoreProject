import json
import threading
import pika
from .controllers import inventory_controller
from .rabbitmq import get_channel

def process_message(ch, method, properties, body):
    """Procesa mensajes recibidos desde RabbitMQ"""
    data = json.loads(body)
    event_type = data.get("event")

    print(f"[INVENTORY] Evento recibido: {event_type} | Datos: {data}")

    if event_type == "order_created":
        for item in data.get("items", []):
            book_id = item["book_id"]
            quantity = item["quantity"]

            current_stock = inventory_controller.check_stock(book_id)
            new_stock = max(current_stock - quantity, 0)
            inventory_controller.update_stock(book_id, new_stock)
            print(f"🟡 Stock actualizado para {book_id}: {current_stock} → {new_stock}")

    elif event_type == "order_canceled":
        for item in data.get("items", []):
            book_id = item["book_id"]
            quantity = item["quantity"]

            current_stock = inventory_controller.check_stock(book_id)
            new_stock = current_stock + quantity
            inventory_controller.update_stock(book_id, new_stock)
            print(f"🔵 Stock restaurado para {book_id}: {current_stock} → {new_stock}")

    ch.basic_ack(delivery_tag=method.delivery_tag)

def start_consumer():
    """Inicia el consumidor de RabbitMQ en un hilo aparte"""
    channel = get_channel()
    queue_name = "inventory_updates"

    channel.queue_declare(queue=queue_name, durable=True)
    channel.basic_consume(queue=queue_name, on_message_callback=process_message)

    print("🐇 [INVENTORY] Esperando mensajes de RabbitMQ...")

    # Se ejecuta en un hilo para no bloquear FastAPI
    thread = threading.Thread(target=channel.start_consuming, daemon=True)
    thread.start()
