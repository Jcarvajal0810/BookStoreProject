package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"payment-service/handlers"
	"payment-service/database"
	"payment-service/grpc/server" // 👈 importamos el servidor gRPC
)

func main() {
	// Leer variables de entorno
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb+srv://Jcarvajal0810:Nutella_0810@sharedm0.d3q2w0n.mongodb.net/paymentdb?retryWrites=true&w=majority&appName=SharedM0"
		log.Println("MONGO_URI no encontrada, usando valor por defecto.")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "7000"
	}

	// Conexión a MongoDB
	database.Connect()
	log.Println("Conectado correctamente a MongoDB Atlas")

	// 🚀 Iniciar el servidor gRPC en segundo plano
	go func() {
		log.Println("Iniciando servidor gRPC de pagos...")
		server.StartGRPCServer()
	}()

	// Configurar router HTTP (REST API)
	r := mux.NewRouter()

	r.HandleFunc("/api/payments/create", handlers.CreatePayment).Methods("POST")
	r.HandleFunc("/api/payments/{reference}/process", handlers.ProcessPayment).Methods("POST")
	r.HandleFunc("/api/payments/{reference}", handlers.GetPayment).Methods("GET")
	r.HandleFunc("/api/payments/user/{userId}", handlers.GetUserPayments).Methods("GET")
	r.HandleFunc("/api/payments/{reference}", handlers.DeletePayment).Methods("DELETE")
	r.HandleFunc("/api/payments/webhook", handlers.WebhookSimulation).Methods("POST")
	r.HandleFunc("/api/payments/test-create", handlers.CreatePaymentTest).Methods("POST")


	// Iniciar servidor HTTP
	log.Printf("Payment Service (REST) corriendo en el puerto %s...\n", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
