from ..config.database import inventory_collection
from bson import ObjectId

def get_all_items():
    items = []
    for item in inventory_collection.find():
        item["_id"] = str(item["_id"])
        items.append(item)
    return items

def get_book(book_id: str):
    item = inventory_collection.find_one({"book_id": book_id})
    if item:
        item["_id"] = str(item["_id"])
    return item or {"error": "Libro no encontrado"}

def create_inventory(item: dict):
    result = inventory_collection.insert_one(item)
    return {"inserted_id": str(result.inserted_id)}

def update_inventory(book_id: str, data: dict):
    result = inventory_collection.update_one(
        {"book_id": book_id},
        {"$set": data},
        upsert=True
    )
    return {"updated_count": result.modified_count}

def delete_inventory(book_id: str):
    result = inventory_collection.delete_one({"book_id": book_id})
    return {"deleted_count": result.deleted_count}

def check_stock(book_id: str):
    item = inventory_collection.find_one({'book_id': book_id})
    if item:
        return item.get('stock', 0)
    return 0

def update_stock(book_id: str, quantity: int):
    inventory_collection.update_one(
        {'book_id': book_id},
        {'$set': {'stock': quantity}},
        upsert=True
    )
    return {'book_id': book_id, 'new_quantity': quantity}
