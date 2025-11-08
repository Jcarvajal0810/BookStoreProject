# Etapa 1: build del binario
FROM golang:1.24-bullseye AS builder

WORKDIR /app

# Copiar los archivos del módulo
COPY go.mod go.sum ./
RUN go mod tidy && go mod download

# Copiar el resto del código fuente
COPY . .

# Compilar el binario (asegurando que quede en /app)
RUN CGO_ENABLED=0 GOOS=linux go build -o payment-service .

# Etapa 2: imagen final liviana
FROM alpine:latest

# Instalar dependencias necesarias para conexiones HTTPS y DNS
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copiar el binario desde el build stage
COPY --from=builder /app/payment-service .

# Exponer los puertos
EXPOSE 7000
EXPOSE 50052

# Ejecutar el binario
ENTRYPOINT ["./payment-service"]
