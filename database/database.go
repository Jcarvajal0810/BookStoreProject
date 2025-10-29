package database

import (
"context"
"log"
"os"
"time"

"go.mongodb.org/mongo-driver/mongo"
"go.mongodb.org/mongo-driver/mongo/options"
)

var Client *mongo.Client
var PaymentsCollection *mongo.Collection

func Connect() {
mongoURI := os.Getenv("MONGO_URI")
if mongoURI == "" {
mongoURI = "mongodb://mongo:27017"
}

ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
if err != nil {
log.Fatal("Error conectando a MongoDB:", err)
}

if err = client.Ping(ctx, nil); err != nil {
log.Fatal("Error haciendo ping a MongoDB:", err)
}

Client = client
PaymentsCollection = client.Database("paymentdb").Collection("payments")
log.Println("Conectado a MongoDB - Database: paymentdb")
}