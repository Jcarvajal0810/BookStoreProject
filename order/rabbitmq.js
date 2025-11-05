// src/rabbit/rabbitmq.js
const amqp = require('amqplib');

let channel;

async function connectRabbitMQ() {
  const url = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASS}@${process.env.RABBITMQ_HOST}:5672`;
  const conn = await amqp.connect(url);
  channel = await conn.createChannel();
  console.log("Connected to RabbitMQ");
}

function getChannel() {
  if (!channel) throw new Error("Channel not initialized");
  return channel;
}

module.exports = { connectRabbitMQ, getChannel };
