FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY go.mod go.sum ./

# Descargar dependencias y regenerar go.sum si falta
RUN go mod tidy && go mod download all

# Copiar el resto del código fuente
COPY . .

# Compilar el binario
RUN go build -o payment-service .

# Imagen final más liviana
FROM alpine:latest

WORKDIR /app
COPY --from=builder /app/payment-service .

EXPOSE 7000

CMD ["./payment-service"]
