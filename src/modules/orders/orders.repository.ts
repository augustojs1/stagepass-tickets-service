import { Inject, Injectable } from '@nestjs/common';
import { count, eq, ExtractTablesWithRelations, sql } from 'drizzle-orm';
import {
  PostgresJsDatabase,
  PostgresJsQueryResultHKT,
} from 'drizzle-orm/postgres-js';
import { PgTransaction } from 'drizzle-orm/pg-core';

import * as schema from '@/infra/database/orm/drizzle/schemas';
import { DATABASE_TAG } from '@/infra/database/orm/drizzle/drizzle.module';
import { OrdersEntity } from '@/modules/orders/models/orders-entity.model';
import { TicketData } from '../tickets/models';
import { OrderEmailTemplateData } from '../emails/models';

@Injectable()
export class OrdersRepository {
  constructor(
    @Inject(DATABASE_TAG)
    private readonly drizzle: PostgresJsDatabase<typeof schema>,
  ) {}

  async updateByProviderReferenceIdTrx(
    trx: PgTransaction<
      PostgresJsQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >,
    orderEntity: Partial<OrdersEntity>,
  ): Promise<void> {
    // await trx
    //           .update(schemas.orders)
    //           .set({
    //             status: 'PAID',
    //           })
    //           .where(eq(schemas.orders.id, payload.order_id));

    await trx
      .update(schema.orders)
      .set({
        status: orderEntity.status,
      })
      .where(eq(schema.orders.id, orderEntity.id));
  }

  async getTicketsByOrderId(
    trx: PgTransaction<
      PostgresJsQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >,
    order_id: string,
  ): Promise<
    {
      ticket_id: string;
      ticket_amount: number;
    }[]
  > {
    // const eventTicketsOrder = await trx
    //           .select({
    //             ticket_id: schemas.event_tickets.id,
    //             ticket_amount: schemas.event_tickets.amount,
    //           })
    //           .from(schemas.order_item)
    //           .innerJoin(
    //             schemas.event_tickets,
    //             eq(schemas.event_tickets.id, schemas.order_item.event_ticket_id),
    //           )
    //           .where(eq(schemas.order_item.order_id, payload.order_id));

    const result = await trx
      .select({
        ticket_id: schema.event_tickets.id,
        ticket_amount: schema.event_tickets.amount,
      })
      .from(schema.order_item)
      .innerJoin(
        schema.event_tickets,
        eq(schema.event_tickets.id, schema.order_item.event_ticket_id),
      )
      .where(eq(schema.order_item.order_id, order_id));

    return result;
  }

  async findById(order_id: string): Promise<OrdersEntity | null> {
    const result = await this.drizzle
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, order_id));

    return result[0] ?? null;
  }

  async findByIdTrx(
    trx: PgTransaction<
      PostgresJsQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >,
    order_id: string,
  ): Promise<OrdersEntity | null> {
    const result = await trx
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, order_id));

    return result[0] ?? null;
  }

  async findOrderAndOrderItemAndEventById(id: string): Promise<TicketData[]> {
    const result = await this.drizzle
      .select({
        event_name: schema.events.name,
        owner_id: schema.users.id,
        order_owner_email: schema.users.email,
        order_id: schema.order_item.order_id,
        order_item_id: schema.order_item.id,
        event_ticket_id: schema.event_tickets.id,
        starts_at: schema.events.starts_at,
        address_number: schema.events.address_number,
        address_district: schema.events.address_district,
        address_street: schema.events.address_street,
        address_city: schema.events.address_city,
        owner_name: schema.order_item.owner_name,
        owner_email: schema.order_item.owner_email,
        unit_price: schema.order_item.unit_price,
      })
      .from(schema.order_item)
      .innerJoin(
        schema.orders,
        eq(schema.orders.id, schema.order_item.order_id),
      )
      .innerJoin(schema.users, eq(schema.users.id, schema.orders.user_id))
      .innerJoin(
        schema.event_tickets,
        eq(schema.event_tickets.id, schema.order_item.event_ticket_id),
      )
      .innerJoin(
        schema.events,
        eq(schema.events.id, schema.event_tickets.event_id),
      )
      .where(eq(schema.order_item.order_id, id));

    return result;
  }

  async findOrderUserEmail(order_id: string): Promise<string | null> {
    const result = await this.drizzle
      .select({
        email: schema.users.email,
      })
      .from(schema.orders)
      .innerJoin(schema.users, eq(schema.orders.user_id, schema.users.id))
      .where(eq(schema.orders.id, order_id));

    return result[0].email ?? null;
  }

  async findOrderEmailTemplateDataById(
    order_id: string,
  ): Promise<OrderEmailTemplateData | null> {
    const result = await this.drizzle
      .select({
        customer_name: schema.users.first_name,
        order_id: schema.orders.id,
        tickets_count: count(schema.order_item.id),
        order_total: schema.orders.total_price,
        event_name: schema.events.name,
        event_date: schema.events.starts_at,
        event_location: sql<string>`
        concat(
          ${schema.events.address_street}, ', ',
          ${schema.events.address_number}, ', ',
          ${schema.events.address_district}, ' - ',
          ${schema.events.address_city}
        )
      `,
        receipt_url: schema.payment_orders.receipt_url,
        checkout_url: schema.payment_orders.checkout_url,
        payment_status: schema.payment_orders.status,
        error_message: schema.payment_orders.error_message,
        current_year: sql<number>`extract(year from now())`,
      })
      .from(schema.orders)
      .innerJoin(
        schema.order_item,
        eq(schema.order_item.order_id, schema.orders.id),
      )
      .innerJoin(
        schema.payment_orders,
        eq(schema.payment_orders.order_id, schema.orders.id),
      )
      .innerJoin(schema.events, eq(schema.events.id, schema.orders.event_id))
      .innerJoin(schema.users, eq(schema.users.id, schema.orders.user_id))
      .where(eq(schema.orders.id, order_id))
      .groupBy(
        schema.users.first_name,
        schema.orders.id,
        schema.orders.total_price,
        schema.events.name,
        schema.events.starts_at,
        schema.events.address_street,
        schema.events.address_number,
        schema.events.address_district,
        schema.events.address_city,
        schema.payment_orders.receipt_url,
        schema.payment_orders.checkout_url,
        schema.payment_orders.status,
        schema.payment_orders.error_message,
      );

    return result[0] ?? null;
  }
}
