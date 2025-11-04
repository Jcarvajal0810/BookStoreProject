package payu

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

const sandboxURL = "https://sandbox.api.payulatam.com/payments-api/4.0/service.cgi"

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

func ProcessPaymentPayU(reference, description string, amount float64, currency, cardNumber, cardHolder, expiryDate, cvv string) (*PayUResponse, error) {
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
			"type":          "AUTHORIZATION_AND_CAPTURE",
			"paymentMethod": "VISA",
		},
		"test": true,
	}

	body, _ := json.Marshal(reqBody)

	client := http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(sandboxURL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("error al conectar con PayU: %v", err)
	}
	defer resp.Body.Close()

	var payuResp PayUResponse
	json.NewDecoder(resp.Body).Decode(&payuResp)

	return &payuResp, nil
}
