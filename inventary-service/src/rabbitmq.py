import pika, os

connection = None
channel = None

def connect_rabbitmq():
    global connection, channel
    credentials = pika.PlainCredentials(
        os.getenv("RABBITMQ_USER", "admin"),
        os.getenv("RABBITMQ_PASS", "admin")
    )
    parameters = pika.ConnectionParameters(
        host=os.getenv("RABBITMQ_HOST", "rabbitmq"),
        port=5672,
        credentials=credentials
    )
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()
    print("✅ Connected to RabbitMQ")
