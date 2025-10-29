package models
import "time"
type Payment struct {
ID string `json:"id" bson:"_id,omitempty"`
Reference string `json:"reference" bson:"reference"`
UserID string `json:"userId" bson:"userId"`
OrderID string `json:"orderId" bson:"orderId"`
Amount float64 `json:"amount" bson:"amount"`
Currency string `json:"currency" bson:"currency"`
Status string `json:"status" bson:"status"`
ResponseCode string `json:"responseCode" bson:"responseCode"`
ResponseMessage string `json:"responseMessage" bson:"responseMessage"`
PaymentMethod string `json:"paymentMethod" bson:"paymentMethod"`
TransactionID string `json:"transactionId" bson:"transactionId"`
Description string `json:"description" bson:"description"`
BuyerEmail string `json:"buyerEmail" bson:"buyerEmail"`
CreatedAt time.Time `json:"createdAt" bson:"createdAt"`
UpdatedAt time.Time `json:"updatedAt" bson:"updatedAt"`
}
type CreatePaymentRequest struct {
UserID string `json:"userId"`
OrderID string `json:"orderId"`
Amount float64 `json:"amount"`
Currency string `json:"currency"`
Description string `json:"description"`
BuyerEmail string `json:"buyerEmail"`
PaymentMethod string `json:"paymentMethod"`
}
type ProcessPaymentRequest struct {
CardNumber string `json:"cardNumber"`
CardHolder string `json:"cardHolder"`
ExpiryDate string `json:"expiryDate"`
CVV string `json:"cvv"`
}
