import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message,
} from '@aws-sdk/client-sqs';

import { EmailsService } from '@/modules/emails/email.service';
import { SendEmailMessageDto } from '@/modules/emails/dtos/send-email-message.dto';

@Injectable()
export class EmailsMessageSqsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailsMessageSqsConsumer.name);

  private readonly queueUrl: string;
  private readonly abortController = new AbortController();

  private isRunning = false;

  constructor(
    private readonly sqsClient: SQSClient,
    private readonly configService: ConfigService,
    private readonly emailsService: EmailsService,
  ) {
    this.queueUrl = this.configService.getOrThrow<string>(
      'aws.sqs.emailQueueUrl',
    );
  }

  onModuleInit(): void {
    this.isRunning = true;
    void this.pollMessages();
  }

  onModuleDestroy(): void {
    this.isRunning = false;
    this.abortController.abort();
  }

  private async pollMessages(): Promise<void> {
    while (this.isRunning) {
      try {
        const response = await this.sqsClient.send(
          new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: 1,
            WaitTimeSeconds: 20,
            MessageSystemAttributeNames: ['ApproximateReceiveCount'],
          }),
          {
            abortSignal: this.abortController.signal,
          },
        );

        for (const message of response.Messages ?? []) {
          if (!this.isRunning) break;

          await this.processMessage(message);
        }
      } catch (error) {
        if (!this.isRunning) break;

        const err = error as Error;

        this.logger.error('Failed to poll SQS email queue', err.stack);

        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  private async processMessage(message: Message): Promise<void> {
    try {
      if (!message.Body || !message.ReceiptHandle) {
        throw new Error('Invalid SQS message');
      }

      const payload = JSON.parse(message.Body) as SendEmailMessageDto;

      const receiveCount = Number(
        message.Attributes?.ApproximateReceiveCount ?? 1,
      );

      this.logger.log(
        `Received email message: order_id=${payload.order_id}, attempt=${receiveCount}`,
      );

      await this.emailsService.sendTransactionalEmail(payload);

      await this.sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: message.ReceiptHandle,
        }),
      );

      this.logger.log(
        `Successfully processed email for order_id=${payload.order_id}`,
      );
    } catch (error) {
      const err = error as Error;

      this.logger.error(
        `Failed to process email message ${message.MessageId}`,
        err.stack,
      );
    }
  }
}
