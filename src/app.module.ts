import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot({})],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
