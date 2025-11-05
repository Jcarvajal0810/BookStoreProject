package rabbit

import (
	"fmt"
	"log"
	"os"
	"github.com/streadway/amqp"
)

var Conn *amqp.Connection
var Channel *amqp.Channel

func ConnectRabbitMQ() {
	host := os.Getenv("RABBITMQ_HOST")
	port := os.Getenv("RABBITMQ_PORT")
	user := os.Getenv("RABBITMQ_USER")
	pass := os.Getenv("RABBITMQ_PASS")

	url := fmt.Sprintf("amqp://%s:%s@%s:%s/", user, pass, host, port)

	conn, err := amqp.Dial(url)
	if err != nil {
		log.Fatalf("No se pudo conectar a RabbitMQ: %v", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("Error creando canal: %v", err)
	}

	Conn = conn
	Channel = ch

	log.Println("Conectado correctamente a RabbitMQ")
}

func Publish(queueName, message string) error {
	_, err := Channel.QueueDeclare(queueName, true, false, false, false, nil)
	if err != nil {
		return err
	}
	return Channel.Publish("", queueName, false, false, amqp.Publishing{
		ContentType: "application/json",
		Body:        []byte(message),
	})
}
