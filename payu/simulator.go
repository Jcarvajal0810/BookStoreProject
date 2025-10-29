package payu

import (
"fmt"
"math/rand"
"strings"
"time"
)

var validTestCards = map[string]string{
"4097440000000004": "VISA",
"4037997623271984": "VISA",
"4111111111111111": "VISA",
"5471300000000003": "MASTERCARD",
"5120697176068275": "MASTERCARD",
"377813000000001":  "AMEX",
"377847626810864":  "AMEX",
"376402004977124":  "AMEX",
"376414000000009":  "AMEX",
"36032400000007":   "DINERS",
"36032404150519":   "DINERS",
"36032440201896":   "DINERS",
}

type PayUResponse struct {
Status            string
ResponseCode      string
ResponseMessage   string
TransactionID     string
AuthorizationCode string
}

func SimulatePayment(cardNumber, cardHolder, expiryDate, cvv string, amount float64) PayUResponse {
cardNumber = strings.ReplaceAll(cardNumber, " ", "")
cardNumber = strings.ReplaceAll(cardNumber, "-", "")

if amount < 1 {
return PayUResponse{
Status:            "ERROR",
ResponseCode:      "INVALID_TRANSACTION",
ResponseMessage:   "El monto debe ser al menos 1 USD",
TransactionID:     "",
AuthorizationCode: "",
}
}

cardType, isValid := validTestCards[cardNumber]
if !isValid {
return PayUResponse{
Status:            "DECLINED",
ResponseCode:      "INVALID_CARD",
ResponseMessage:   "Tarjeta invalida o no autorizada para pruebas",
TransactionID:     "",
AuthorizationCode: "",
}
}

if cardHolder == "" || len(cardHolder) < 3 {
return PayUResponse{
Status:            "ERROR",
ResponseCode:      "INVALID_CARD_HOLDER",
ResponseMessage:   "Nombre del titular invalido",
TransactionID:     "",
AuthorizationCode: "",
}
}

if cvv == "" || len(cvv) < 3 {
return PayUResponse{
Status:            "DECLINED",
ResponseCode:      "INVALID_CVV",
ResponseMessage:   "CVV invalido",
TransactionID:     "",
AuthorizationCode: "",
}
}

outcome := rand.Intn(100)

switch {
case outcome < 70:
return PayUResponse{
Status:            "APPROVED",
ResponseCode:      "APPROVED",
ResponseMessage:   fmt.Sprintf("Transaccion aprobada - %s", cardType),
TransactionID:     fmt.Sprintf("TXN-PAYU-%d-%d", time.Now().Unix(), rand.Intn(100000)),
AuthorizationCode: fmt.Sprintf("AUTH-%d", rand.Intn(999999)),
}
case outcome < 80:
return PayUResponse{
Status:            "DECLINED",
ResponseCode:      "ANTIFRAUD_REJECTED",
ResponseMessage:   "Transaccion rechazada por sistema antifraude PayU",
TransactionID:     "",
AuthorizationCode: "",
}
case outcome < 90:
return PayUResponse{
Status:            "DECLINED",
ResponseCode:      "INSUFFICIENT_FUNDS",
ResponseMessage:   "Fondos insuficientes",
TransactionID:     "",
AuthorizationCode: "",
}
case outcome < 95:
return PayUResponse{
Status:            "DECLINED",
ResponseCode:      "EXPIRED_CARD",
ResponseMessage:   "Tarjeta vencida",
TransactionID:     "",
AuthorizationCode: "",
}
default:
return PayUResponse{
Status:            "ERROR",
ResponseCode:      "ENTITY_DECLINED",
ResponseMessage:   "Transaccion rechazada por el banco emisor",
TransactionID:     "",
AuthorizationCode: "",
}
}
}