from fastapi import APIRouter
from ..controllers.inventory_controller import (
    get_all_items,
    get_book,
    create_inventory,
    update_inventory,
    delete_inventory,
    check_stock,
)

router = APIRouter()

#  1. Ruta para obtener productos con bajo stock (menos de 5 unidades)
@router.get('/low-stock')
def low_stock():
    """Devuelve los libros con stock bajo (menos de 5 unidades)"""
    items = get_all_items()
    low = [item for item in items if item.get("stock", 0) < 5]
    return {"low_stock": low}

#  2. Ruta para obtener todos los productos del inventario
@router.get('/')
def get_all():
    """Obtiene todos los productos del inventario"""
    return get_all_items()

#  3. Ruta para obtener un libro específico por su ID lógico (book_id)
@router.get('/{book_id}')
def get_inventory_book(book_id: str):
    """Obtiene un libro específico por su book_id"""
    return get_book(book_id)

#  4. Ruta para crear un nuevo producto
@router.post('/')
def create_item(item: dict):
    """Crea un nuevo producto en el inventario"""
    return create_inventory(item)

#  5. Ruta para actualizar un producto existente
@router.put('/{book_id}')
def update_item(book_id: str, data: dict):
    """Actualiza la información de un producto existente"""
    return update_inventory(book_id, data)

# 6. Ruta para eliminar un producto
@router.delete('/{book_id}')
def delete_item(book_id: str):
    """Elimina un producto del inventario"""
    return delete_inventory(book_id)
