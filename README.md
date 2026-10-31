# 🎟️ StagePass Tickets Service

**StagePass Tickets Service** is a background worker responsible for **generating digital tickets**, **storing PDF files in Amazon S3**, and **publishing ticket availability notifications** through Amazon SQS.

Built with **NestJS, TypeScript, PostgreSQL, Drizzle ORM, Amazon SQS, and Amazon S3**, the service focuses on asynchronous processing, event-driven communication, and reliable ticket generation.

### 🔑 Key Features

- 📥 **Asynchronous Ticket Processing** — consumes messages from Amazon SQS to trigger ticket generation after successful purchases.
- 🎫 **Digital Ticket Generation** — automatically generates PDF tickets containing unique QR codes for event check-in.
- ☁️ **Amazon S3 Integration** — securely stores generated PDF tickets in cloud storage.
- 📤 **Event-Driven Communication** — publishes ticket availability messages to a dedicated Amazon SQS email queue.
- 📧 **Decoupled Email Delivery** — delegates email notifications to a separate worker responsible for consuming messages and notifying customers when their tickets are available.
- 🔄 **Background Processing** — handles ticket generation independently from the main API, preventing resource-intensive operations from blocking HTTP requests.

---

### ⚙️ Processing Workflow

1. **Payment Confirmation** — a successful purchase triggers a ticket generation message.
2. **SQS Message Consumption** — the Tickets
