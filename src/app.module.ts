import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { configuration } from '@/infra/config/configuration';
import { DrizzleModule } from '@/infra/database/orm/drizzle/drizzle.module';
import { HttpRequestInterceptor } from '@/infra/interceptors';
import { MessagesModule } from './infra/messages/messages.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { EmailsModule } from './modules/emails/emails.module';
import { SMTPModule } from './infra/smtp/smtp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `${process.cwd()}/src/infra/config/env/${process.env.NODE_ENV}.env`,
      isGlobal: true,
      load: [configuration],
    }),
    DrizzleModule,
    TicketsModule,
    MessagesModule,
    EmailsModule,
    SMTPModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpRequestInterceptor,
    },
  ],
})
export class AppModule {}
