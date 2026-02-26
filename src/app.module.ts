import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { AuthzModule } from './authz/authz.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthzModule,
    AuthModule,
    UserModule,
    EventEmitterModule.forRoot({}),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
