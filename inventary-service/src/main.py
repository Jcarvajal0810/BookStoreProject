from fastapi import FastAPI
from .routes.inventory_routes import router as inventory_router

app = FastAPI(title='Inventory Service')

app.include_router(inventory_router, prefix='/api/inventory')

@app.get('/')
def root():
    return {'message': 'Inventory Service Running'}
