package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"payment-service/database"
	"payment-service/models"
	"payment-service/payu"
	"regexp"
	"time"
	"payment-service/rabbit"

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

	reference := fmt.Sprintf("REF-%d", time.Now().Unix())

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
		http.Error(w, `{"error":"database insert failed"}`, http.StatusInternalServerError)
		return
	}
	payment.ID = result.InsertedID.(primitive.ObjectID).Hex()

	// 🔹 Publicar evento de pago creado
	event := map[string]interface{}{
		"event":     "payment_created",
		"reference": payment.Reference,
		"orderId":   payment.OrderID,
		"userId":    payment.UserID,
		"amount":    payment.Amount,
		"status":    payment.Status,
	}
	body, _ := json.Marshal(event)

	if err := rabbit.Publish("payment_events", string(body)); err != nil {
		fmt.Printf("Error enviando mensaje a RabbitMQ: %v\n", err)
	}


	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(payment)
}

// ------------------- PROCESAR PAGO (Simulación PayU Sandbox) -------------------

func ProcessPayment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	reference := vars["reference"]

	var req models.ProcessPaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid JSON"}`, http.StatusBadRequest)
		return
	}

	if req.CardNumber == "" || req.CardHolder == "" || req.ExpiryDate == "" || req.CVV == "" {
		http.Error(w, `{"error":"complete card data required"}`, http.StatusBadRequest)
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

	// 🔹 Simulación de pago con PayU
	resp := payu.SimulatePayment(
		req.CardNumber,
		req.CardHolder,
		req.ExpiryDate,
		req.CVV,
		payment.Amount,
	)

	newStatus := resp.Status
	newCode := resp.ResponseCode
	newMsg := resp.ResponseMessage
	txn := resp.TransactionID

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
		http.Error(w, `{"error":"update failed"}`, http.StatusInternalServerError)
		return
	}

	var updated models.Payment
	err = database.PaymentsCollection.FindOne(context.Background(), bson.M{"reference": reference}).Decode(&updated)
	if err != nil {
		http.Error(w, `{"error":"fetch after update failed"}`, http.StatusInternalServerError)
		return
	}

	// 🔹 Publicar evento de pago procesado
	event := map[string]interface{}{
		"event":     "payment_processed",
		"reference": updated.Reference,
		"orderId":   updated.OrderID,
		"userId":    updated.UserID,
		"amount":    updated.Amount,
		"status":    updated.Status,
	}
	body, _ := json.Marshal(event)

	if err := rabbit.Publish("payment_events", string(body)); err != nil {
		fmt.Printf("Error enviando mensaje a RabbitMQ: %v\n", err)
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
		http.Error(w, `{"error":"db error"}`, http.StatusInternalServerError)
		return
	}
	defer cursor.Close(context.Background())

	var payments []models.Payment
	if err := cursor.All(context.Background(), &payments); err != nil {
		http.Error(w, `{"error":"cursor error"}`, http.StatusInternalServerError)
		return
	}

	if payments == nil {
		payments = []models.Payment{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payments)
}

// ------------------- ELIMINAR PAGO -------------------

func DeletePayment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ref := vars["reference"]

	result, err := database.PaymentsCollection.DeleteOne(context.Background(), bson.M{"reference": ref})
	if err != nil {
		http.Error(w, `{"error":"delete failed"}`, http.StatusInternalServerError)
		return
	}
	if result.DeletedCount == 0 {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted", "reference": ref})
}

// ------------------- CREAR PAGO SIMULADO (APROBADO) -------------------

func CreatePaymentTest(w http.ResponseWriter, r *http.Request) {
	var req models.CreatePaymentRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	if req.UserID == "" {
		req.UserID = "test-user-id"
	}
	if req.BuyerEmail == "" {
		req.BuyerEmail = "test@example.com"
	}
	if req.OrderID == "" {
		req.OrderID = fmt.Sprintf("ORDER-TEST-%d", time.Now().Unix())
	}
	if req.Amount <= 0 {
		req.Amount = 1000
	}
	if req.PaymentMethod == "" {
		req.PaymentMethod = "credit_card"
	}
	if req.Currency == "" {
		req.Currency = "COP"
	}
	if req.Description == "" {
		req.Description = "Pago simulado"
	}

	reference := fmt.Sprintf("SIM-%d", time.Now().Unix())

	payment := models.Payment{
		Reference:       reference,
		UserID:          req.UserID,
		OrderID:         req.OrderID,
		Amount:          req.Amount,
		Currency:        req.Currency,
		Status:          "APPROVED",
		ResponseCode:    "POL_APPROVED",
		ResponseMessage: "Aprobada (simulada)",
		PaymentMethod:   req.PaymentMethod,
		Description:     req.Description,
		BuyerEmail:      req.BuyerEmail,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	result, _ := database.PaymentsCollection.InsertOne(context.Background(), payment)
	payment.ID = result.InsertedID.(primitive.ObjectID).Hex()
	//RABBIT MQQQ
	event := map[string]interface{}{
		"event":     "payment_test_created",
		"reference": payment.Reference,
		"orderId":   payment.OrderID,
		"userId":    payment.UserID,
		"amount":    payment.Amount,
		"status":    payment.Status,
	}
	body, _ := json.Marshal(event)
	rabbit.Publish("payment_events", string(body))
	

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(payment)
}

// ------------------- WEBHOOK SIMULADO -------------------

func WebhookSimulation(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	response := map[string]string{
		"status":  "ok",
		"message": "Simulación de webhook PayU exitosa",
		"event":   "payment.approved",
	}

	json.NewEncoder(w).Encode(response)
}