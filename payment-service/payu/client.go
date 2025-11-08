package payu

import (
	"bytes"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

func generateSignature(referenceCode string, amount float64, currency string) string {
	apiKey := os.Getenv("PAYU_API_KEY")
	merchantId := os.Getenv("PAYU_MERCHANT_ID")

	// PayU requiere el monto SIN decimales para COP o con 2 decimales para otras monedas
	var amountStr string
	if currency == "COP" {
		// Para COP, PayU espera el valor sin decimales
		amountStr = fmt.Sprintf("%.0f", amount)
	} else {
		amountStr = fmt.Sprintf("%.2f", amount)
	}
	
	// Formato: ApiKey~merchantId~referenceCode~amount~currency
	data := fmt.Sprintf("%s~%s~%s~%s~%s", 
		apiKey, 
		merchantId, 
		referenceCode, 
		amountStr, 
		currency,
	)
	
	fmt.Printf("🔐 Generando firma con: %s\n", data)
	hash := md5.Sum([]byte(data))
	signature := fmt.Sprintf("%x", hash)
	fmt.Printf("✅ Firma generada: %s\n", signature)
	return signature
}

const sandboxURL = "https://sandbox.api.payulatam.com/payments-api/4.0/service.cgi"

type PayUResponse struct {
	Code                string `json:"code"`
	Error               string `json:"error"`
	TransactionResponse struct {
		OrderID        interface{} `json:"orderId"`       
		TransactionID  string      `json:"transactionId"`
		State          string      `json:"state"`
		PaymentNetwork string      `json:"paymentNetworkResponseCode"`
		ResponseCode   string      `json:"responseCode"`
		ResponseMsg    string      `json:"responseMessage"`
	} `json:"transactionResponse"`
}

// Función helper para obtener OrderID como string
func (r *PayUResponse) GetOrderID() string {
	switch v := r.TransactionResponse.OrderID.(type) {
	case string:
		return v
	case float64:
		return fmt.Sprintf("%.0f", v)
	case int64:
		return fmt.Sprintf("%d", v)
	default:
		return ""
	}
}

type SimulatedPaymentResponse struct {
	Status          string
	ResponseCode    string
	ResponseMessage string
	TransactionID   string
}

func detectCardType(cardNumber string) string {
	cardNumber = strings.ReplaceAll(cardNumber, " ", "")
	cardNumber = strings.ReplaceAll(cardNumber, "-", "")

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

func convertExpiryDate(expiryDate string) string {
	if len(expiryDate) == 7 && strings.Count(expiryDate, "/") == 1 {
		parts := strings.Split(expiryDate, "/")
		if len(parts[0]) == 4 {
			return expiryDate
		}
	}

	expiryDate = strings.ReplaceAll(expiryDate, " ", "")
	parts := strings.Split(expiryDate, "/")
	
	if len(parts) != 2 {
		return "2025/12"
	}

	month := parts[0]
	year := parts[1]

	if len(month) == 1 {
		month = "0" + month
	}

	if len(year) == 2 {
		year = "20" + year
	}

	return fmt.Sprintf("%s/%s", year, month)
}

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

func ProcessPaymentPayU(reference, description string, amount float64, currency, cardNumber, cardHolder, expiryDate, cvv string) (*PayUResponse, error) {
	// Validar credenciales
	apiLogin := os.Getenv("PAYU_API_LOGIN")
	apiKey := os.Getenv("PAYU_API_KEY")
	merchantId := os.Getenv("PAYU_MERCHANT_ID")
	accountId := os.Getenv("PAYU_ACCOUNT_ID")

	if apiLogin == "" || apiKey == "" || merchantId == "" || accountId == "" {
		return nil, fmt.Errorf("❌ Variables de entorno de PayU no configuradas correctamente")
	}

	fmt.Printf("🔧 Usando credenciales:\n")
	fmt.Printf("   API_LOGIN: %s\n", apiLogin)
	fmt.Printf("   MERCHANT_ID: %s\n", merchantId)
	fmt.Printf("   ACCOUNT_ID: %s\n", accountId)
	
	cardNumber = strings.ReplaceAll(cardNumber, " ", "")
	cardNumber = strings.ReplaceAll(cardNumber, "-", "")
	expiryDate = convertExpiryDate(expiryDate)
	cardType := detectCardType(cardNumber)

	// Para COP, PayU espera el valor como entero
	var txValue string
	if currency == "COP" {
		txValue = fmt.Sprintf("%.0f", amount)
	} else {
		txValue = fmt.Sprintf("%.2f", amount)
	}

	reqBody := map[string]interface{}{
		"language": "es",
		"command":  "SUBMIT_TRANSACTION",
		"merchant": map[string]string{
			"apiLogin": apiLogin,
			"apiKey":   apiKey,
		},
		"transaction": map[string]interface{}{
			"order": map[string]interface{}{
				"accountId":     accountId,
				"referenceCode": reference,
				"description":   description,
				"language":      "es",
				"signature":     generateSignature(reference, amount, currency),
				"notifyUrl": "http://payment:7000/api/payments/webhook",

				"additionalValues": map[string]interface{}{
					"TX_VALUE": map[string]interface{}{
						"value":    txValue,
						"currency": currency,
					},
				},
				"buyer": map[string]interface{}{
					"merchantBuyerId": "1",
					"fullName":        cardHolder,
					"emailAddress":    "test@test.com",
					"contactPhone":    "3001234567",
					"dniNumber":       "123456789",
					"shippingAddress": map[string]interface{}{
						"street1":    "Calle 100",
						"street2":    "Oficina 201",
						"city":       "Bogota",
						"state":      "Bogota D.C.",
						"country":    "CO",
						"postalCode": "110111",
						"phone":      "3001234567",
					},
				},
			},
			"payer": map[string]interface{}{
				"merchantPayerId": "1",
				"fullName":        cardHolder,
				"emailAddress":    "test@test.com",
				"contactPhone":    "3001234567",
				"dniNumber":       "123456789",
				"billingAddress": map[string]interface{}{
					"street1":    "Calle 100",
					"street2":    "Oficina 201",
					"city":       "Bogota",
					"state":      "Bogota D.C.",
					"country":    "CO",
					"postalCode": "110111",
					"phone":      "3001234567",
				},
			},
			"creditCard": map[string]interface{}{
				"number":         cardNumber,
				"securityCode":   cvv,
				"expirationDate": expiryDate,
				"name":           cardHolder,
			},
			"extraParameters": map[string]string{
				"INSTALLMENTS_NUMBER": "1",
			},
			"type":           "AUTHORIZATION_AND_CAPTURE",
			"paymentMethod":  cardType,
			"paymentCountry": "CO",
			"deviceSessionId": fmt.Sprintf("vghs6tvkcle931686k1900o6e%d", time.Now().UnixNano()),
			"ipAddress":      "127.0.0.1",
			"cookie":         "pt1t38347bs6jc9ruv2ecpv7o2",
			"userAgent":      "Mozilla/5.0 (Windows NT 5.1; rv:18.0) Gecko/20100101 Firefox/18.0",
		},
		"test": true,
	}

	body, _ := json.MarshalIndent(reqBody, "", "  ")
	fmt.Println("📤 REQUEST A PAYU:")
	fmt.Println(string(body))

	client := http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest("POST", sandboxURL, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("error creando request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error al conectar con PayU: %v", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error al leer respuesta de PayU: %v", err)
	}

	fmt.Printf("📥 RESPUESTA DE PAYU (Status: %d):\n", resp.StatusCode)
	fmt.Println(string(bodyBytes))

	// Verificar si es HTML (error de autenticación)
	if strings.HasPrefix(string(bodyBytes), "<") {
		return nil, fmt.Errorf("❌ PayU devolvió HTML. Verifica:\n1. Credenciales (API_LOGIN, API_KEY, MERCHANT_ID, ACCOUNT_ID)\n2. URL correcta\n3. Estado de la cuenta sandbox")
	}

	var payuResp PayUResponse
	if err := json.Unmarshal(bodyBytes, &payuResp); err != nil {
		return nil, fmt.Errorf("error al parsear respuesta de PayU: %v\nRespuesta: %s", err, string(bodyBytes))
	}

	return &payuResp, nil
}