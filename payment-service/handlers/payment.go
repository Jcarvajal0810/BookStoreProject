package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"payment-service/database"
	"payment-service/models"
	"regexp"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ------------------- VALIDACIONES -------------------

func isValidEmail(email string) bool {
	re := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	return re.MatchString(email)
}

// ------------------- CREAR PAGO -------------------

func CreatePayment(w http.ResponseWriter, r *http.Request) {
	var req models.CreatePaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid JSON"}`, http.StatusBadRequest)
		return
	}

	if req.UserID == "" {
		http.Error(w, `{"error":"userId required"}`, http.StatusBadRequest)
		return
	}
	if req.OrderID == "" {
		http.Error(w, `{"error":"orderId required"}`, http.StatusBadRequest)
		return
	}
	if req.Amount <= 0 {
		http.Error(w, `{"error":"amount > 0"}`, http.StatusBadRequest)
		return
	}
	if req.BuyerEmail == "" || !isValidEmail(req.BuyerEmail) {
		http.Error(w, `{"error":"valid email required"}`, http.StatusBadRequest)
		return
	}
	if req.Description == "" {
		http.Error(w, `{"error":"description required"}`, http.StatusBadRequest)
		return
	}

	if req.PaymentMethod == "" {
		req.PaymentMethod = "credit_card"
	}
	if req.Currency == "" {
		req.Currency = "COP"
	}

	reference := fmt.Sprintf("REF-%d-%d", time.Now().Unix(), rand.Intn(10000))

	payment := models.Payment{
		Reference:       reference,
		UserID:          req.UserID,
		OrderID:         req.OrderID,
		Amount:          req.Amount,
		Currency:        req.Currency,
		Status:          "PENDING",
		ResponseCode:    "PENDING_PAYMENT",
		ResponseMessage: "Pendiente",
		PaymentMethod:   req.PaymentMethod,
		Description:     req.Description,
		BuyerEmail:      req.BuyerEmail,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	result, err := database.PaymentsCollection.InsertOne(context.Background(), payment)
	if err != nil {
		http.Error(w, `{"error":"database insert failed"}`, 500)
		return
	}
	payment.ID = result.InsertedID.(primitive.ObjectID).Hex()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(payment)
}

// ------------------- PROCESAR PAGO -------------------

func ProcessPayment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	reference := vars["reference"]

	var req models.ProcessPaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid JSON"}`, http.StatusBadRequest)
		return
	}
	if req.CardNumber == "" || req.CardHolder == "" {
		http.Error(w, `{"error":"card data required"}`, http.StatusBadRequest)
		return
	}

	// Buscar pago
	var payment models.Payment
	err := database.PaymentsCollection.FindOne(context.Background(), bson.M{"reference": reference}).Decode(&payment)
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	if payment.Status != "PENDING" {
		http.Error(w, `{"error":"already processed"}`, http.StatusBadRequest)
		return
	}

	// Simular proceso
	time.Sleep(time.Duration(2+rand.Intn(3)) * time.Second)
	randomResult := rand.Intn(100)

	var newStatus, newCode, newMsg, txn string
	if randomResult < 80 {
		newStatus = "APPROVED"
		newCode = "POL_APPROVED"
		newMsg = "Aprobada"
		txn = fmt.Sprintf("TXN-%d", time.Now().Unix())
	} else if randomResult < 95 {
		newStatus = "DECLINED"
		newCode = "POL_DECLINED"
		newMsg = "Rechazada"
	} else {
		newStatus = "ERROR"
		newCode = "POL_ERROR"
		newMsg = "Error en el procesamiento"
	}

	update := bson.M{
		"$set": bson.M{
			"status":          newStatus,
			"responseCode":    newCode,
			"responseMessage": newMsg,
			"transactionId":   txn,
			"updatedAt":       time.Now(),
		},
	}

	_, err = database.PaymentsCollection.UpdateOne(context.Background(), bson.M{"reference": reference}, update)
	if err != nil {
		http.Error(w, `{"error":"update failed"}`, 500)
		return
	}

	var updated models.Payment
	err = database.PaymentsCollection.FindOne(context.Background(), bson.M{"reference": reference}).Decode(&updated)
	if err != nil {
		http.Error(w, `{"error":"fetch after update failed"}`, 500)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated)
}

// ------------------- OBTENER POR REFERENCIA -------------------

func GetPayment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	var payment models.Payment
	err := database.PaymentsCollection.FindOne(context.Background(), bson.M{"reference": vars["reference"]}).Decode(&payment)
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payment)
}

// ------------------- OBTENER PAGOS POR USUARIO -------------------

func GetUserPayments(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	cursor, err := database.PaymentsCollection.Find(context.Background(), bson.M{"userId": vars["userId"]})
	if err != nil {
		http.Error(w, `{"error":"db error"}`, 500)
		return
	}
	defer cursor.Close(context.Background())

	var payments []models.Payment
	if err := cursor.All(context.Background(), &payments); err != nil {
		http.Error(w, `{"error":"cursor error"}`, 500)
		return
	}

	if payments == nil {
		payments = []models.Payment{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payments)
}

// ------------------- SIMULACIÓN WEBHOOK -------------------

func WebhookSimulation(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// ------------------- ELIMINAR PAGO -------------------

func DeletePayment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ref := vars["reference"]

	result, err := database.PaymentsCollection.DeleteOne(context.Background(), bson.M{"reference": ref})
	if err != nil {
		http.Error(w, `{"error":"delete failed"}`, 500)
		return
	}
	if result.DeletedCount == 0 {
		http.Error(w, `{"error":"not found"}`, 404)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted", "reference": ref})
}
