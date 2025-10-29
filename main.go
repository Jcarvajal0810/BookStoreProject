package main

import (
"log"
"net/http"
"os"
"payment-service/database"
"payment-service/handlers"

"github.com/gorilla/mux"
)

func main() {
database.Connect()
router := mux.NewRouter()

api := router.PathPrefix("/api").Subrouter()

api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
w.Header().Set("Content-Type", "application/json")
w.WriteHeader(http.StatusOK)
w.Write([]byte(`{"status":"healthy","service":"payment-service-payu"}`))
}).Methods("GET")

api.HandleFunc("/payments/create", handlers.CreatePayment).Methods("POST")
api.HandleFunc("/payments", handlers.GetAllPayments).Methods("GET")
api.HandleFunc("/payments/{id}", handlers.GetPayment).Methods("GET")
api.HandleFunc("/payments/order/{orderId}", handlers.GetPaymentByOrderID).Methods("GET")
api.HandleFunc("/payments/user/{userId}", handlers.GetPaymentsByUserID).Methods("GET")
api.HandleFunc("/payments/{id}/process", handlers.ProcessPayment).Methods("POST")

router.Use(func(next http.Handler) http.Handler {
return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
w.Header().Set("Access-Control-Allow-Origin", "*")
w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
if r.Method == "OPTIONS" {
w.WriteHeader(http.StatusOK)
return
}
next.ServeHTTP(w, r)
})
})

port := os.Getenv("PORT")
if port == "" {
port = "7000"
}

log.Printf("Payment Service PayU iniciado en http://localhost:%s", port)
log.Printf("Usando MongoDB Atlas: paymentdb.payments")

if err := http.ListenAndServe(":"+port, router); err != nil {
log.Fatal(err)
}
}