import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, eq } from 'drizzle-orm';

import { DATABASE_TAG } from '@/infra/database/orm/drizzle/drizzle.module';
import * as schema from '@/infra/database/orm/drizzle/schemas';

import { InsertTicketParams } from './models/insert-ticket-params.model';
import { TicketEntity } from './models';

type FindOrCreateTicketParams = Pick<
  InsertTicketParams,
  'owner_id' | 'order_item_id' | 'event_ticket_id'
>;

@Injectable()
export class TicketsRepository {
  constructor(
    @Inject(DATABASE_TAG)
    private readonly drizzle: PostgresJsDatabase<typeof schema>,
  ) {}

  async create(data: InsertTicketParams): Promise<TicketEntity> {
    const [createdTicket] = await this.drizzle
      .insert(schema.tickets)
      .values(data)
      .returning();

    return createdTicket;
  }

  async findOrCreateByOrderItemId(
    data: FindOrCreateTicketParams,
  ): Promise<TicketEntity> {
    const [createdTicket] = await this.drizzle
      .insert(schema.tickets)
      .values({
        owner_id: data.owner_id,
        order_item_id: data.order_item_id,
        event_ticket_id: data.event_ticket_id,
        code: `STP_${randomUUID()}`,
      })
      .onConflictDoNothing({
        target: schema.tickets.order_item_id,
      })
      .returning();

    if (createdTicket) {
      return createdTicket;
    }

    const [existingTicket] = await this.drizzle
      .select()
      .from(schema.tickets)
      .where(eq(schema.tickets.order_item_id, data.order_item_id))
      .limit(1);

    if (!existingTicket) {
      throw new Error(
        `Failed to find or create ticket for order_item_id=${data.order_item_id}`,
      );
    }

    return existingTicket;
  }

  async updateFileUrl(id: string, url: string): Promise<void> {
    await this.drizzle
      .update(schema.tickets)
      .set({
        file_url: url,
        updated_at: new Date(),
      })
      .where(eq(schema.tickets.id, id));
  }

  async findTicketAndUserByOrderId(order_id: string) {
    return this.drizzle
      .select({
        ticket_id: schema.tickets.id,
        order_item_id: schema.tickets.order_item_id,
        user_email: schema.users.email,
        ticket_file_url: schema.tickets.file_url,
        ticket_code: schema.tickets.code,
      })
      .from(schema.tickets)
      .innerJoin(
        schema.order_item,
        eq(schema.tickets.order_item_id, schema.order_item.id),
      )
      .innerJoin(schema.users, eq(schema.tickets.owner_id, schema.users.id))
      .where(eq(schema.order_item.order_id, order_id));
  }

  async findByOrderIdAndOwnerId(
    order_id: string,
    owner_id: string,
  ): Promise<TicketEntity[]> {
    const tickets = await this.drizzle
      .select({
        ticket: schema.tickets,
      })
      .from(schema.tickets)
      .innerJoin(
        schema.order_item,
        eq(schema.tickets.order_item_id, schema.order_item.id),
      )
      .where(
        and(
          eq(schema.order_item.order_id, order_id),
          eq(schema.tickets.owner_id, owner_id),
        ),
      );

    return tickets.map(({ ticket }) => ticket);
  }
}
