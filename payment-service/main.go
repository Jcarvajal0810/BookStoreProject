package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"payment-service/handlers"
	"payment-service/database"
)

func main() {
	// Leer variables de entorno (por compatibilidad, aunque no se usen en Connect)
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb+srv://Jcarvajal0810:Nutella_0810@sharedm0.d3q2w0n.mongodb.net/paymentdb?retryWrites=true&w=majority&appName=SharedM0"
		log.Println("  MONGO_URI no encontrada, usando valor por defecto.")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "7000"
	}

	//  Llamar a Connect() sin pasar argumentos
	database.Connect()
	log.Println(" Conectado correctamente a MongoDB Atlas")

	// Router principal
	r := mux.NewRouter()

	// Endpoints del servicio de pagos
	r.HandleFunc("/api/payments/create", handlers.CreatePayment).Methods("POST")
	r.HandleFunc("/api/payments/{reference}/process", handlers.ProcessPayment).Methods("POST")
	r.HandleFunc("/api/payments/{reference}", handlers.GetPayment).Methods("GET")
	r.HandleFunc("/api/payments/user/{userId}", handlers.GetUserPayments).Methods("GET")
	r.HandleFunc("/api/payments/{reference}", handlers.DeletePayment).Methods("DELETE")
	r.HandleFunc("/api/payments/webhook", handlers.WebhookSimulation).Methods("POST")

	// Servidor web
	log.Printf(" Payment Service corriendo en el puerto %s...\n", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
