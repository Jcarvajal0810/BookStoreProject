package client

import (
    "context"
    "log"

    pb "payment-service/payment"
    "google.golang.org/grpc"
)

func CallProcessPayment() {
    conn, err := grpc.Dial("payment:50052", grpc.WithInsecure())

    if err != nil {
        log.Fatalf("No se pudo conectar: %v", err)
    }
    defer conn.Close()

    client := pb.NewPaymentServiceClient(conn)

    resp, err := client.ProcessPayment(context.Background(), &pb.PaymentRequest{
        OrderId:       "order123",
        UserId:        "user456",
        Amount:        49.99,
        PaymentMethod: "card",
    })
    if err != nil {
        log.Fatalf("Error en ProcessPayment: %v", err)
    }

    log.Printf("Respuesta del Payment Service: %+v", resp)
}
