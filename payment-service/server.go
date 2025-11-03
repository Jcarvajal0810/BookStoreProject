package main

import (
    "context"
    "log"
    "net"

    pb "payment-service/payment"
    "google.golang.org/grpc"
)

// Struct que implementa el servicio
type PaymentServer struct {
    pb.UnimplementedPaymentServiceServer
}

// Implementación del método ProcessPayment
func (s *PaymentServer) ProcessPayment(ctx context.Context, req *pb.PaymentRequest) (*pb.PaymentResponse, error) {
    // Aquí va tu lógica de pago, por ahora devolvemos éxito simulado
    return &pb.PaymentResponse{
        Success:       true,
        TransactionId: "tx123",
        Message:       "Pago procesado correctamente",
    }, nil
}

func main() {
    lis, err := net.Listen("tcp", ":50052")
    if err != nil {
        log.Fatalf("Error al escuchar: %v", err)
    }

    grpcServer := grpc.NewServer()
    pb.RegisterPaymentServiceServer(grpcServer, &PaymentServer{})

    log.Println("Servidor Payment gRPC corriendo en :50052")
    if err := grpcServer.Serve(lis); err != nil {
        log.Fatalf("Error al iniciar el servidor: %v", err)
    }
}
