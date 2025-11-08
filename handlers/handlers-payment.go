package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"payment-service/database"
	"payment-service/models"
	"payment-service/payu"
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
	w.Header().Set("Content-Type", "application/json")
	
	var req models.CreatePaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf(" Error decodificando JSON en CreatePayment: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid JSON"})
		return
	}

	if req.UserID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "userId required"})
		return
	}
	if req.OrderID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "orderId required"})
		return
	}
	if req.Amount <= 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "amount > 0"})
		return
	}
	if req.BuyerEmail == "" || !isValidEmail(req.BuyerEmail) {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "valid email required"})
		return
	}
	if req.Description == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "description required"})
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
		log.Printf(" Error insertando pago: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "database insert failed"})
		return
	}
	payment.ID = result.InsertedID.(primitive.ObjectID)

	log.Printf(" Pago creado: %s", reference)
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(payment)
}

// ------------------- PROCESAR PAGO (Simulación PayU Sandbox) -------------------

func ProcessPayment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	vars := mux.Vars(r)
	reference := vars["reference"]

	log.Printf(" ProcessPayment llamado para referencia: %s", reference)

	var req models.ProcessPaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf(" Error decodificando JSON: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid JSON"})
		return
	}

	if req.CardNumber == "" || req.CardHolder == "" || req.ExpiryDate == "" || req.CVV == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "complete card data required"})
		return
	}

	// Buscar pago
	var payment models.Payment
	err := database.PaymentsCollection.FindOne(context.Background(), bson.M{"reference": reference}).Decode(&payment)
	if err != nil {
		log.Printf(" Pago no encontrado: %s", reference)
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "payment not found"})
		return
	}

	//  Verificar si ya fue procesado (idempotencia)
	if payment.Status != "PENDING" {
		log.Printf(" Pago ya procesado: %s con estado %s", reference, payment.Status)
		
		// Si ya fue APROBADO, devolver 200 OK con el payment
		if payment.Status == "APPROVED" {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(payment)
			return
		}
		
		// Si fue rechazado o está en otro estado, devolver 400
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":           "already processed",
			"status":          payment.Status,
			"message":         fmt.Sprintf("Payment already processed with status: %s", payment.Status),
			"payment":         payment,
			"responseCode":    payment.ResponseCode,
			"responseMessage": payment.ResponseMessage,
		})
		return
	}

	// 🔹 Simulación de pago con PayU
	log.Printf(" Procesando pago con PayU simulado...")
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

	log.Printf(" Resultado PayU: Status=%s, Code=%s, TxnID=%s", newStatus, newCode, txn)

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
		log.Printf(" Error actualizando pago: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "update failed"})
		return
	}

	var updated models.Payment
	err = database.PaymentsCollection.FindOne(context.Background(), bson.M{"reference": reference}).Decode(&updated)
	if err != nil {
		log.Printf(" Error obteniendo pago actualizado: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "fetch after update failed"})
		return
	}

	log.Printf(" Pago procesado exitosamente: %s - %s", reference, newStatus)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(updated)
}

// ------------------- OBTENER POR REFERENCIA -------------------

func GetPayment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	vars := mux.Vars(r)
	var payment models.Payment
	err := database.PaymentsCollection.FindOne(context.Background(), bson.M{"reference": vars["reference"]}).Decode(&payment)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "not found"})
		return
	}
	json.NewEncoder(w).Encode(payment)
}

// ------------------- OBTENER PAGOS POR USUARIO -------------------

func GetUserPayments(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	vars := mux.Vars(r)
	cursor, err := database.PaymentsCollection.Find(context.Background(), bson.M{"userId": vars["userId"]})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "db error"})
		return
	}
	defer cursor.Close(context.Background())

	var payments []models.Payment
	if err := cursor.All(context.Background(), &payments); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "cursor error"})
		return
	}

	if payments == nil {
		payments = []models.Payment{}
	}

	json.NewEncoder(w).Encode(payments)
}

// ------------------- ELIMINAR PAGO -------------------

func DeletePayment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	vars := mux.Vars(r)
	ref := vars["reference"]

	result, err := database.PaymentsCollection.DeleteOne(context.Background(), bson.M{"reference": ref})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "delete failed"})
		return
	}
	if result.DeletedCount == 0 {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "not found"})
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"status": "deleted", "reference": ref})
}

// ------------------- CREAR PAGO SIMULADO (APROBADO) -------------------

func CreatePaymentTest(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
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
	payment.ID = result.InsertedID.(primitive.ObjectID)

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