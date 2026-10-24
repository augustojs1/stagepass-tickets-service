import { Module } from '@nestjs/common';

import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

@Module({
  providers: [OrdersRepository, OrdersService],
  exports: [OrdersRepository, OrdersService],
})
export class OrdersModule {}
