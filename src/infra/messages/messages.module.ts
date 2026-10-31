import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { TicketsModule } from '@/modules/tickets/tickets.module';
import { SqsModule } from './sqs/sqs.module';
import { EmailsMessageSqsProducer } from './producers/emails/sqs/emails-message-sqs.producer';
import { TicketsMessageSqsConsumer } from './consumers/tickets/sqs/tickets-message-sqs.consumers';
import { IEmailsMessageProducer } from './producers/emails/interfaces/iemails-message-producer.interface';
import { ITicketsMessageConsumer } from './consumers/tickets/interfaces/itickets-messages.consumer';
import { SqsPollingOrchestratorService } from './sqs/sqs-polling-orchestrator.service';

@Module({
  providers: [
    SqsPollingOrchestratorService,
    {
      provide: ITicketsMessageConsumer,
      useClass: TicketsMessageSqsConsumer,
    },
    {
      provide: IEmailsMessageProducer,
      useClass: EmailsMessageSqsProducer,
    },
  ],
  imports: [ConfigModule, forwardRef(() => TicketsModule), SqsModule],
  exports: [ITicketsMessageConsumer, IEmailsMessageProducer],
})
export class MessagesModule {}
