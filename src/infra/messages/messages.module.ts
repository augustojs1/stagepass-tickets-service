import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ITicketsMessageProducer } from './producers/tickets/interfaces/message-producer.interface';
import { IEmailsMessageProducer } from './producers/emails/interfaces/iemails-message-producer.interface';
import { EmailsModule } from '@/modules/emails/emails.module';
import { TicketsModule } from '@/modules/tickets/tickets.module';
import { SqsModule } from './sqs/sqs.module';
import { EmailsMessageSqsConsumer } from './consumers/emails/sqs/emails-message-sqs.consumer';
import { TicketsMessageSqsProducer } from './producers/tickets/sqs/tickets-message-sqs.producers';

@Module({
  providers: [
    {
      provide: ITicketsMessageProducer,
      useClass: TicketsMessageSqsProducer,
    },
    {
      provide: IEmailsMessageProducer,
      useClass: EmailsMessageSqsConsumer,
    },
  ],
  imports: [
    ConfigModule,
    EmailsModule,
    forwardRef(() => TicketsModule),
    SqsModule,
  ],
  exports: [ITicketsMessageProducer, IEmailsMessageProducer],
})
export class MessagesModule {}
