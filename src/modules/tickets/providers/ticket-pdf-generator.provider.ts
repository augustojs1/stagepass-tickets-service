import * as fs from 'fs';
import * as path from 'path';

import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';

import { TicketData } from '../models';

@Injectable()
export class TicketPdfGeneratorProvider {
  private readonly appHost: string;

  constructor(private readonly configService: ConfigService) {
    this.appHost = this.configService.getOrThrow<string>('app_host');
  }

  async generate(ticketData: TicketData): Promise<Buffer<ArrayBufferLike>> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    });

    const buffers: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    const qrBuffer = await QRCode.toBuffer(
      `${this.appHost}/${ticketData.code}`,
    );

    const formattedDate = this.formatEventDate(
      ticketData.starts_at,
      ticketData.timezone,
    );

    const address = this.formatAddress(ticketData);

    doc.fontSize(24).text(ticketData.event_name, { align: 'center' });

    doc.moveDown(2);

    const startY = doc.y;

    const leftColumnX = 50;
    const rightColumnX = 300;

    doc
      .fontSize(12)
      .text('Date', leftColumnX, startY)
      .fontSize(14)
      .text(formattedDate, leftColumnX);

    doc.moveDown();

    doc
      .fontSize(12)
      .text('Location', leftColumnX)
      .fontSize(14)
      .text(address, leftColumnX, doc.y, { width: 200 });

    doc
      .fontSize(12)
      .text('Attendee', rightColumnX, startY)
      .fontSize(14)
      .text(ticketData.owner_name, rightColumnX);

    doc.moveDown();

    doc
      .fontSize(12)
      .text('Email', rightColumnX)
      .fontSize(14)
      .text(ticketData.owner_email, rightColumnX);

    doc.moveDown();

    doc
      .fontSize(12)
      .text('Price', rightColumnX)
      .fontSize(14)
      .text(`$ ${(ticketData.unit_price / 100).toFixed(2)}`, rightColumnX);

    doc.moveDown(4);

    const pageWidth = doc.page.width;
    const qrSize = 200;

    const qrX = (pageWidth - qrSize) / 2;

    doc.image(qrBuffer, qrX, doc.y, {
      width: qrSize,
    });

    doc.moveDown(0.3);

    doc.fontSize(10).text('Present this QR Code at the event entrance', {
      align: 'center',
    });

    const result = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      doc.on('error', reject);
    });

    doc.end();

    return result;
  }

  saveOnDisk(buffer: Buffer<ArrayBufferLike>, bufferName: string): void {
    const filePath = path.join(process.cwd(), `ticket_${bufferName}.pdf`);

    fs.writeFileSync(filePath, buffer);
  }

  private formatEventDate(date: Date, timezone: string): string {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(date);

    const getPart = (type: Intl.DateTimeFormatPartTypes): string => {
      return parts.find((part) => part.type === type)?.value ?? '';
    };

    const hours = getPart('hour');
    const minutes = getPart('minute');
    const day = getPart('day');
    const month = getPart('month');
    const year = getPart('year');

    return `${hours}h${minutes} - ${day} of ${month}, ${year} (${timezone})`;
  }

  private formatAddress(event: TicketData): string {
    return `${event.address_street}, ${event.address_number} - ${event.address_district}, ${event.address_city}`;
  }
}
