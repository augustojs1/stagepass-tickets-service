export abstract class ITicketsMessageConsumer {
  abstract handle(payload: { order_id: string }): Promise<void>;
}
