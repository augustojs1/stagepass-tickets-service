import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

// import { PaymentMessageRabbitMqConsumer } from './consumers/payment/impl/rabbit-mq/payment-message-rabbitmq.consumer';
// import { PaymentOrdersModule } from '@/modules/payment-orders/payment-orders.module';
// import { PaymentGatewayModule } from '../payment-gateway/payment-gateway.module';
import { configuration } from '../config/configuration';
import { ITicketsMessageProducer } from './producers/tickets/interfaces/message-producer.interface';
import { TicketsMessageRabbitMqProducer } from './producers/tickets/impl/tickets-message-rabbitmq.producer';
import { TicketsMessageRabbitMqConsumer } from './consumers/tickets/impl/rabbit-mq/tickets-message-rabbitmq.consumer';
import { IEmailsMessageProducer } from './producers/emails/interfaces/iemails-message-producer.interface';
import { EmailsMessageRabbitMqProducer } from './producers/emails/impl/emails-message-rabbitmq.producer';
import { EmailsMessageRabbitMqConsumer } from './consumers/emails/impl/rabbit-mq/emails-message-rabbitmq.consumer';
// import { RabbitMqProducerService } from './brokers/rabbit-mq/rabbit-mq-producer.service';
import { EmailsModule } from '@/modules/emails/emails.module';
import { TicketsModule } from '@/modules/tickets/tickets.module';

const env_variables = configuration();

@Module({
  controllers: [
    // PaymentMessageRabbitMqConsumer,
    TicketsMessageRabbitMqConsumer,
    EmailsMessageRabbitMqConsumer,
  ],
  providers: [
    // RabbitMqProducerService,
    {
      provide: ITicketsMessageProducer,
      useClass: TicketsMessageRabbitMqProducer,
    },
    {
      provide: IEmailsMessageProducer,
      useClass: EmailsMessageRabbitMqProducer,
    },
  ],
  imports: [
    ConfigModule,
    ClientsModule.register([
      {
        name: 'ticket_queue',
        transport: Transport.RMQ,
        options: {
          urls: [env_variables.rmq.url],
          queue: env_variables.rmq.queue_ticket_generate,
          queueOptions: {
            durable: true,
          },
          prefetchCount: 10,
        },
      },
      {
        name: 'email_queue',
        transport: Transport.RMQ,
        options: {
          urls: [env_variables.rmq.url],
          queue: env_variables.rmq.queue_email_send,
          queueOptions: {
            durable: true,
          },
          prefetchCount: 10,
        },
      },
    ]),
    // PaymentOrdersModule,
    // PaymentGatewayModule,
    EmailsModule,
    // forwardRef(() => PaymentOrdersModule),
    forwardRef(() => TicketsModule),
  ],
  exports: [ITicketsMessageProducer, IEmailsMessageProducer],
})
export class MessagesModule {}
