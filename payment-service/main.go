package main

import (
	"log"
	"net/http"
	"os"
	"payment-service/database"
	"payment-service/grpc/server"
	"payment-service/handlers"
	"github.com/gorilla/mux"
	"rabbit"
)

func main() {
	// ----------------------
	// Configuración de MongoDB
	// ----------------------
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb+srv://Jcarvajal0810:Nutella_0810@sharedm0.d3q2w0n.mongodb.net/paymentdb?retryWrites=true&w=majority&appName=SharedM0"
		log.Println("MONGO_URI no encontrada, usando valor por defecto.")
	}
	rabbit.ConnectRabbitMQ()
	// Conexión a MongoDB (sin asignar a err porque Connect() no retorna nada)
	database.Connect()
	log.Println(" Conectado correctamente a MongoDB Atlas")

	// ----------------------
	// Configuración del puerto REST
	// ----------------------
	port := os.Getenv("PORT")
	if port == "" {
		port = "7000"
	}

	// ----------------------
	// Iniciar servidor gRPC en segundo plano
	// ----------------------
	go func() {
		log.Println("🚀 Iniciando servidor gRPC de pagos en puerto 50052...")
		server.StartGRPCServer()
	}()

	// ----------------------
	// Configurar router REST
	// ----------------------
	r := mux.NewRouter()
	r.HandleFunc("/api/payments/create", handlers.CreatePayment).Methods("POST")
	r.HandleFunc("/api/payments/{reference}/process", handlers.ProcessPayment).Methods("POST")
	r.HandleFunc("/api/payments/{reference}", handlers.GetPayment).Methods("GET")
	r.HandleFunc("/api/payments/user/{userId}", handlers.GetUserPayments).Methods("GET")
	r.HandleFunc("/api/payments/{reference}", handlers.DeletePayment).Methods("DELETE")
	r.HandleFunc("/api/payments/webhook", handlers.WebhookSimulation).Methods("POST")
	r.HandleFunc("/api/payments/test-create", handlers.CreatePaymentTest).Methods("POST")

	// ----------------------
	// Iniciar servidor REST
	// ----------------------
	log.Printf("🚀 Payment Service (REST) corriendo en el puerto %s...\n", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Error iniciando REST server: %v", err)
		defer rabbit.Conn.Close()
		defer rabbit.Channel.Close()

	}
}