package handlers

import (
"context"
"encoding/json"
"fmt"
"math/rand"
"net/http"
"payment-service/database"
"payment-service/models"
"payment-service/payu"
"time"

"github.com/gorilla/mux"
"go.mongodb.org/mongo-driver/bson"
"go.mongodb.org/mongo-driver/bson/primitive"
)

func init() {
rand.Seed(time.Now().UnixNano())
}

func CreatePayment(w http.ResponseWriter, r *http.Request) {
var req models.CreatePaymentRequest
if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
http.Error(w, "Solicitud invalida", http.StatusBadRequest)
return
}

payment := models.Payment{
ID:                primitive.NewObjectID(),
Reference:         fmt.Sprintf("REF-PAYU-%d-%d", time.Now().Unix(), rand.Intn(10000)),
UserID:            req.UserID,
OrderID:           req.OrderID,
Amount:            req.Amount,
Currency:          req.Currency,
Status:            "PENDING",
ResponseCode:      "PENDING_PAYMENT_CONFIRMATION",
ResponseMessage:   "Pago pendiente de confirmacion",
PaymentMethod:     req.PaymentMethod,
TransactionID:     "",
AuthorizationCode: "",
Description:       req.Description,
BuyerEmail:        req.BuyerEmail,
CreatedAt:         time.Now(),
UpdatedAt:         time.Now(),
}

ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

_, err := database.PaymentsCollection.InsertOne(ctx, payment)
if err != nil {
http.Error(w, "Error creando el pago", http.StatusInternalServerError)
return
}

w.Header().Set("Content-Type", "application/json")
w.WriteHeader(http.StatusCreated)
json.NewEncoder(w).Encode(payment)
}

func ProcessPayment(w http.ResponseWriter, r *http.Request) {
vars := mux.Vars(r)
id := vars["id"]

objectID, err := primitive.ObjectIDFromHex(id)
if err != nil {
http.Error(w, "ID invalido", http.StatusBadRequest)
return
}

var req models.ProcessPaymentRequest
if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
http.Error(w, "Solicitud invalida", http.StatusBadRequest)
return
}

ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

var payment models.Payment
err = database.PaymentsCollection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&payment)
if err != nil {
http.Error(w, "Pago no encontrado", http.StatusNotFound)
return
}

if payment.Status != "PENDING" {
http.Error(w, "El pago ya fue procesado", http.StatusBadRequest)
return
}

payuResponse := payu.SimulatePayment(req.CardNumber, req.CardHolder, req.ExpiryDate, req.CVV, payment.Amount)

payment.Status = payuResponse.Status
payment.ResponseCode = payuResponse.ResponseCode
payment.ResponseMessage = payuResponse.ResponseMessage
payment.TransactionID = payuResponse.TransactionID
payment.AuthorizationCode = payuResponse.AuthorizationCode
payment.UpdatedAt = time.Now()

_, err = database.PaymentsCollection.UpdateOne(ctx, bson.M{"_id": objectID}, bson.M{"$set": payment})
if err != nil {
http.Error(w, "Error actualizando el pago", http.StatusInternalServerError)
return
}

response := models.PaymentResponse{
Status:            payuResponse.Status,
ResponseCode:      payuResponse.ResponseCode,
ResponseMessage:   payuResponse.ResponseMessage,
TransactionID:     payuResponse.TransactionID,
AuthorizationCode: payuResponse.AuthorizationCode,
}

w.Header().Set("Content-Type", "application/json")
json.NewEncoder(w).Encode(response)
}

func GetPayment(w http.ResponseWriter, r *http.Request) {
vars := mux.Vars(r)
id := vars["id"]

ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

var payment models.Payment
var err error

if objectID, errID := primitive.ObjectIDFromHex(id); errID == nil {
err = database.PaymentsCollection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&payment)
} else {
err = database.PaymentsCollection.FindOne(ctx, bson.M{"reference": id}).Decode(&payment)
}

if err != nil {
http.Error(w, "Pago no encontrado", http.StatusNotFound)
return
}

w.Header().Set("Content-Type", "application/json")
json.NewEncoder(w).Encode(payment)
}

func GetPaymentByOrderID(w http.ResponseWriter, r *http.Request) {
vars := mux.Vars(r)
orderID := vars["orderId"]

ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

var payment models.Payment
err := database.PaymentsCollection.FindOne(ctx, bson.M{"orderId": orderID}).Decode(&payment)
if err != nil {
http.Error(w, "Pago no encontrado", http.StatusNotFound)
return
}

w.Header().Set("Content-Type", "application/json")
json.NewEncoder(w).Encode(payment)
}

func GetPaymentsByUserID(w http.ResponseWriter, r *http.Request) {
vars := mux.Vars(r)
userID := vars["userId"]

ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

cursor, err := database.PaymentsCollection.Find(ctx, bson.M{"userId": userID})
if err != nil {
http.Error(w, "Error obteniendo pagos", http.StatusInternalServerError)
return
}
defer cursor.Close(ctx)

var payments []models.Payment
if err = cursor.All(ctx, &payments); err != nil {
http.Error(w, "Error decodificando pagos", http.StatusInternalServerError)
return
}

w.Header().Set("Content-Type", "application/json")
json.NewEncoder(w).Encode(payments)
}

func GetAllPayments(w http.ResponseWriter, r *http.Request) {
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

cursor, err := database.PaymentsCollection.Find(ctx, bson.M{})
if err != nil {
http.Error(w, "Error obteniendo pagos", http.StatusInternalServerError)
return
}
defer cursor.Close(ctx)

var payments []models.Payment
if err = cursor.All(ctx, &payments); err != nil {
http.Error(w, "Error decodificando pagos", http.StatusInternalServerError)
return
}

w.Header().Set("Content-Type", "application/json")
json.NewEncoder(w).Encode(payments)
}