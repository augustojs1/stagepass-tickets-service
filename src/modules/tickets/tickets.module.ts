import { forwardRef, Module } from '@nestjs/common';

import { TicketsService } from './tickets.service';
import { TicketsRepository } from './tickets.repository';
import { OrdersModule } from '../orders/orders.module';
import {
  TicketPdfGeneratorProvider,
  TicketStoragePathFactory,
} from './providers';
import { AppHttpModule } from '@/infra/http/http.module';
import { MessagesModule } from '@/infra/messages/messages.module';
import { StorageModule } from '@/infra/storage/storage.module';

@Module({
  imports: [
    OrdersModule,
    AppHttpModule,
    forwardRef(() => MessagesModule),
    StorageModule,
  ],
  providers: [
    TicketsService,
    TicketsRepository,
    TicketPdfGeneratorProvider,
    TicketStoragePathFactory,
  ],
  exports: [TicketsService],
})
export class TicketsModule {}
