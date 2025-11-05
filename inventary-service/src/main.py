from fastapi import FastAPI
from .routes.inventory_routes import router as inventory_router
from .rabbitmq import connect_rabbitmq
from .rabbitmq_consumer import start_consumer

app = FastAPI(title='Inventory Service')

app.include_router(inventory_router, prefix='/api/inventory')

@app.on_event("startup")
def startup_event():
    connect_rabbitmq()
    start_consumer()
    print("Inventory Service y consumidor RabbitMQ inicializados")

@app.get('/')
def root():
    return {'message': 'Inventory Service Running'}
