import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { AuthModule } from './auth/auth.module';
import { AuthzModule } from './authz/authz.module';
import { MenuModule } from './modules/menu/menu.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { UserModule } from './user/user.module';
import { ProductModule } from './modules/product/product.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthzModule,
    AuthModule,
    UserModule,
    EventEmitterModule.forRoot({}),
    MenuModule,
    ProductModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
