from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Cargar variables de entorno (.env)
load_dotenv()

MONGO_URI = os.getenv('MONGO_URI')

# Conexión a MongoDB Atlas
client = MongoClient(MONGO_URI)
db = client["inventorydb"]
inventory_collection = db["inventory"]

print(" Conectado a MongoDB Atlas correctamente")
