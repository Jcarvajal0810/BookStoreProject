package payu

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
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
type SimulatedPaymentResponse struct {
	Status          string
	ResponseCode    string
	ResponseMessage string
	TransactionID   string
}

// ------------------- DETECCIÓN DEL TIPO DE TARJETA -------------------
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

// ------------------- CONVERTIR FECHA MM/YY a YYYY/MM -------------------
func convertExpiryDate(expiryDate string) string {
	// Si ya viene en formato YYYY/MM, devolverla tal cual
	if len(expiryDate) == 7 && strings.Count(expiryDate, "/") == 1 {
		parts := strings.Split(expiryDate, "/")
		if len(parts[0]) == 4 {
			return expiryDate
		}
	}

	// Convertir de MM/YY a YYYY/MM
	expiryDate = strings.ReplaceAll(expiryDate, " ", "")
	parts := strings.Split(expiryDate, "/")
	
	if len(parts) != 2 {
		// Formato inválido, devolver fecha por defecto
		return "2025/12"
	}

	month := parts[0]
	year := parts[1]

	// Asegurar que el mes tenga 2 dígitos
	if len(month) == 1 {
		month = "0" + month
	}

	// Si el año tiene 2 dígitos, convertir a 4
	if len(year) == 2 {
		year = "20" + year
	}

	return fmt.Sprintf("%s/%s", year, month)
}

// ------------------- SIMULAR PAGO -------------------
func SimulatePayment(cardNumber, cardHolder, expiryDate, cvv string, amount float64) SimulatedPaymentResponse {
	reference := fmt.Sprintf("REF-%d", time.Now().UnixNano())
	description := "Pago simulado"
	currency := "COP"

	payuResp, err := ProcessPaymentPayU(reference, description, amount, currency, cardNumber, cardHolder, expiryDate, cvv)
	
	if err != nil {
		return SimulatedPaymentResponse{
			Status:          "REJECTED",
			ResponseCode:    "ERROR",
			ResponseMessage: fmt.Sprintf("Error al procesar: %v", err),
			TransactionID:   "",
		}
	}

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
	// 🔹 Limpiar número de tarjeta
	cardNumber = strings.ReplaceAll(cardNumber, " ", "")
	cardNumber = strings.ReplaceAll(cardNumber, "-", "")
	
	// 🔹 Convertir fecha de expiración
	expiryDate = convertExpiryDate(expiryDate)
	
	// 🔹 Detectar tipo de tarjeta
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
				"expirationDate": expiryDate,
				"name":           cardHolder,
			},
			"type":            "AUTHORIZATION_AND_CAPTURE",
			"paymentMethod":   cardType,
			"paymentCountry":  "CO",
			"deviceSessionId": fmt.Sprintf("SIM-%d", time.Now().UnixNano()),
		},
		"test": true,
	}

	body, _ := json.Marshal(reqBody)

	// 🔹 Loggear el request que se envía a PayU
	fmt.Println(" REQUEST A PAYU:")
	fmt.Println(string(body))

	client := http.Client{Timeout: 15 * time.Second}
	resp, err := client.Post(sandboxURL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("error al conectar con PayU: %v", err)
	}
	defer resp.Body.Close()

	// 🔹 Leer la respuesta CRUDA primero
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error al leer respuesta de PayU: %v", err)
	}

	// 🔹 Loggear la respuesta cruda
	fmt.Println(" RESPUESTA CRUDA DE PAYU:")
	fmt.Println(string(bodyBytes))

	// 🔹 Verificar si es HTML (error)
	if strings.HasPrefix(string(bodyBytes), "<") {
		return nil, fmt.Errorf("error al leer respuesta de PayU: invalid character '<' looking for beginning of value")
	}

	// 🔹 Parsear JSON
	var payuResp PayUResponse
	if err := json.Unmarshal(bodyBytes, &payuResp); err != nil {
		return nil, fmt.Errorf("error al parsear respuesta de PayU: %v", err)
	}

	return &payuResp, nil
}