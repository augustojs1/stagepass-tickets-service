import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TicketsRepository } from './tickets.repository';
import { OrdersRepository } from '../orders/orders.repository';
import {
  TicketPdfGeneratorProvider,
  TicketStoragePathFactory,
} from './providers';
import { ICloudStorageService } from '@/infra/storage';
import { HTTP_UPLOADER } from '@/infra/http/http.module';
import { HttpClientService } from '@/infra/http/http-client.service';
import { IEmailsMessageProducer } from '@/infra/messages/producers/emails/interfaces/iemails-message-producer.interface';
import { EmailTemplateType } from '../emails/enums/email-template-type.enum';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @Inject(HTTP_UPLOADER)
    private readonly httpClientService: HttpClientService,
    private readonly ticketsRepository: TicketsRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly ticketPdfGeneratorProvider: TicketPdfGeneratorProvider,
    private readonly storageService: ICloudStorageService,
    private readonly ticketStoragePathFactory: TicketStoragePathFactory,
    private readonly configService: ConfigService,
    private readonly emailsMessageProducer: IEmailsMessageProducer,
  ) {}

  async handleGenerate(order_id: string): Promise<void> {
    try {
      const order = await this.ordersRepository.findById(order_id);

      if (!order) {
        throw new Error(`Order order_id=${order_id} not found!`);
      }

      if (order.status !== 'PAID') {
        throw new Error(
          `Order order_id=${order_id} is not paid! Current status=${order.status}`,
        );
      }

      const ticketsToGenerate =
        await this.ordersRepository.findOrderAndOrderItemAndEventById(order_id);

      if (!ticketsToGenerate.length) {
        throw new Error(`No order items found for order_id=${order_id}`);
      }

      const customerEmail = ticketsToGenerate[0].order_owner_email;

      for (const ticket of ticketsToGenerate) {
        const createdTicket =
          await this.ticketsRepository.findOrCreateByOrderItemId({
            owner_id: ticket.owner_id,
            order_item_id: ticket.order_item_id,
            event_ticket_id: ticket.event_ticket_id,
          });

        if (createdTicket.file_url) {
          this.logger.log(
            `Ticket already generated. Skipping PDF generation. order_item_id=${ticket.order_item_id}`,
          );

          continue;
        }

        this.logger.log(
          `Generating ticket PDF for order_item_id=${ticket.order_item_id}`,
        );

        const pdfBuffer = await this.ticketPdfGeneratorProvider.generate({
          ...ticket,
          code: createdTicket.code,
        });

        const ticketKey = this.ticketStoragePathFactory.generateKey({
          order_id,
          code: createdTicket.code,
          owner_id: createdTicket.owner_id,
        });

        const response = await this.storageService.createPresignedUploadUrl(
          ticketKey,
          2000,
          'application/pdf',
        );

        await this.uploadPdfToPresignedUrl(response.uploadUrl, pdfBuffer);

        const ticketPublicUrl = this.ticketStoragePathFactory.generateUrl({
          order_id,
          code: createdTicket.code,
          owner_id: createdTicket.owner_id,
          publicUrl: this.configService.getOrThrow<string>('aws.s3.public_url'),
        });

        await this.ticketsRepository.updateFileUrl(
          createdTicket.id,
          ticketPublicUrl,
        );

        this.logger.log(
          `Successfully generated ticket PDF. ticket_id=${createdTicket.id}, order_item_id=${ticket.order_item_id}`,
        );
      }

      await this.emailsMessageProducer.emit({
        type: EmailTemplateType.TICKETS_AVAILABLE,
        order_id: order.id,
        to: customerEmail,
      });

      this.logger.log(
        `Successfully completed ticket generation for order_id=${order_id}`,
      );
    } catch (error) {
      const err = error as Error;

      this.logger.error(
        `Failed to generate tickets for order_id=${order_id}`,
        err.stack,
      );

      throw error;
    }
  }

  async uploadPdfToPresignedUrl(
    uploadUrl: string,
    pdfBuffer: Buffer,
  ): Promise<void> {
    try {
      await this.httpClientService.putBinary(uploadUrl, pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': pdfBuffer.length,
        },
        timeoutMs: 30_000,
        responseType: 'text',
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        validateStatus: (s) => s >= 200 && s < 300,
      });

      this.logger.log(`Success to upload PDF ticket.`);
    } catch (err: any) {
      this.logger.error(`Failed to upload PDF ticket.`, err);
      throw err;
    }
  }

  async findTicketAndUserByOrderId(order_id: string) {
    return await this.ticketsRepository.findTicketAndUserByOrderId(order_id);
  }
}
