import { Module } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { MenuItemController } from './menu-item.controller';
import { MenuItemService } from './menu-item.service';

@Module({
  controllers: [MenuController, MenuItemController],
  providers: [MenuService, MenuItemService],
})
export class MenuModule {}
