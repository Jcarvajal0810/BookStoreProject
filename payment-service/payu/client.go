package payu

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

// URL del entorno de pruebas (sandbox)
const sandboxURL = "https://sandbox.api.payulatam.com/payments-api/4.0/service.cgi"

// ------------------- RESPUESTA -------------------

type PayUResponse struct {
	Code                string `json:"code"`
	Error               string `json:"error"`
	TransactionResponse struct {
		OrderID        string `json:"orderId"`
		TransactionID  string `json:"transactionId"`
		State          string `json:"state"`
		PaymentNetwork string `json:"paymentNetwork"`
		ResponseCode   string `json:"responseCode"`
		ResponseMsg    string `json:"responseMessage"`
	} `json:"transactionResponse"`
}

// ------------------- RESPUESTA SIMPLIFICADA -------------------
// Estructura que retorna SimulatePayment para el handler
type SimulatedPaymentResponse struct {
	Status          string
	ResponseCode    string
	ResponseMessage string
	TransactionID   string
}

// ------------------- DETECCIÓN DEL TIPO DE TARJETA -------------------
// Detecta VISA, MASTERCARD, AMEX, DINERS, DISCOVER, etc.
func detectCardType(cardNumber string) string {
	cardNumber = strings.ReplaceAll(cardNumber, " ", "")

	if strings.HasPrefix(cardNumber, "4") {
		return "VISA"
	}
	if strings.HasPrefix(cardNumber, "5") {
		return "MASTERCARD"
	}
	if strings.HasPrefix(cardNumber, "34") || strings.HasPrefix(cardNumber, "37") {
		return "AMEX"
	}
	if strings.HasPrefix(cardNumber, "36") || strings.HasPrefix(cardNumber, "38") {
		return "DINERS"
	}
	if strings.HasPrefix(cardNumber, "6") {
		return "DISCOVER"
	}
	return "UNKNOWN"
}

// ------------------- SIMULAR PAGO (VERSIÓN SIMPLIFICADA) -------------------
// SimulatePayment procesa un pago usando los datos de la tarjeta
// Orden de parámetros: cardNumber, cardHolder, expiryDate, cvv, amount
func SimulatePayment(cardNumber, cardHolder, expiryDate, cvv string, amount float64) SimulatedPaymentResponse {
	// Generar referencia única
	reference := fmt.Sprintf("REF-%d", time.Now().UnixNano())
	description := "Pago simulado"
	currency := "COP"

	// Llamar a la función completa de PayU
	payuResp, err := ProcessPaymentPayU(reference, description, amount, currency, cardNumber, cardHolder, expiryDate, cvv)
	
	// Si hay error, retornar pago rechazado
	if err != nil {
		return SimulatedPaymentResponse{
			Status:          "REJECTED",
			ResponseCode:    "ERROR",
			ResponseMessage: fmt.Sprintf("Error al procesar: %v", err),
			TransactionID:   "",
		}
	}

	// Mapear el estado de PayU a nuestro formato
	status := "REJECTED"
	if payuResp.TransactionResponse.State == "APPROVED" {
		status = "APPROVED"
	} else if payuResp.TransactionResponse.State == "PENDING" {
		status = "PENDING"
	}

	return SimulatedPaymentResponse{
		Status:          status,
		ResponseCode:    payuResp.TransactionResponse.ResponseCode,
		ResponseMessage: payuResp.TransactionResponse.ResponseMsg,
		TransactionID:   payuResp.TransactionResponse.TransactionID,
	}
}

// ------------------- PROCESAR PAGO -------------------

func ProcessPaymentPayU(reference, description string, amount float64, currency, cardNumber, cardHolder, expiryDate, cvv string) (*PayUResponse, error) {
	cardType := detectCardType(cardNumber)

	reqBody := map[string]interface{}{
		"language": "es",
		"command":  "SUBMIT_TRANSACTION",
		"merchant": map[string]string{
			"apiLogin": os.Getenv("PAYU_API_LOGIN"),
			"apiKey":   os.Getenv("PAYU_API_KEY"),
		},
		"transaction": map[string]interface{}{
			"order": map[string]interface{}{
				"accountId":     os.Getenv("PAYU_ACCOUNT_ID"),
				"referenceCode": reference,
				"description":   description,
				"language":      "es",
				"notifyUrl":     "https://www.payu.com/notify",
				"additionalValues": map[string]interface{}{
					"TX_VALUE": map[string]interface{}{
						"value":    amount,
						"currency": currency,
					},
				},
			},
			"payer": map[string]string{
				"fullName": cardHolder,
			},
			"creditCard": map[string]string{
				"number":         cardNumber,
				"securityCode":   cvv,
				"expirationDate": expiryDate, // formato: YYYY/MM
				"name":           cardHolder,
			},
			"type":            "AUTHORIZATION_AND_CAPTURE",
			"paymentMethod":   cardType,
			"paymentCountry":  "CO",
			"deviceSessionId": fmt.Sprintf("SIM-%d", time.Now().UnixNano()),
		},
		"test": true, // 🔹 esto activa el modo simulación (sandbox)
	}

	body, _ := json.Marshal(reqBody)

	client := http.Client{Timeout: 15 * time.Second}
	resp, err := client.Post(sandboxURL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("error al conectar con PayU: %v", err)
	}
	defer resp.Body.Close()

	var payuResp PayUResponse
	if err := json.NewDecoder(resp.Body).Decode(&payuResp); err != nil {
		return nil, fmt.Errorf("error al leer respuesta de PayU: %v", err)
	}

	return &payuResp, nil
}