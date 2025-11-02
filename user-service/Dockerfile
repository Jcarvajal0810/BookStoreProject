# build stage
FROM maven:3.8.7-eclipse-temurin-17 as builder
WORKDIR /app

COPY pom.xml .
COPY src ./src

#  Instalar certificados SSL actualizados (evita errores al descargar dependencias)
RUN apt-get update && apt-get install -y ca-certificates && update-ca-certificates

#  Compilar y ejecutar los tests
RUN mvn -B package

# run stage
FROM eclipse-temurin:17-jdk
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 6000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
