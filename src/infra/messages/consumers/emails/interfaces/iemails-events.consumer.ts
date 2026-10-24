export abstract class IEmailsMessagesConsumer {
  abstract handle(payload: any): Promise<void>;
}
