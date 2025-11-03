package main

import (
    "context"
    "log"

    pb "payment-service/payment"
    "google.golang.org/grpc"
)

func main() {
    // Conectarse al servidor gRPC
    conn, err := grpc.Dial("localhost:50051", grpc.WithInsecure())
    if err != nil {
        log.Fatalf("No se pudo conectar: %v", err)
    }
    defer conn.Close()

    // Crear cliente
    client := pb.NewPaymentServiceClient(conn)

    // Llamar al método ProcessPayment
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
