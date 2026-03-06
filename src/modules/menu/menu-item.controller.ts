import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { MenuItemService } from './menu-item.service';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import { DeleteMenuItemDto } from './dto/delete-menu-item.dto';
import { RolesGuard } from 'src/authz/guards/roles.guard';
import { PermissionsGuard } from 'src/authz/guards/permissions.guard';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { Roles } from 'src/authz/decorators/roles.decorator';
import { Role } from 'prisma/generated/enums';

@Controller('menus/:menuId/items')
@Roles([Role.ADMIN])
@UseGuards(AccessTokenGuard, RolesGuard, PermissionsGuard)
export class MenuItemController {
  constructor(private readonly menuItemService: MenuItemService) {}

  @Post(':menuId/items')
  @ResponseMessage('Menu item created successfully')
  createMenuItem(
    @Param('menuId') menuId: string,
    @Body() dto: CreateMenuItemDto,
  ) {
    return this.menuItemService.create({ ...dto, menuId });
  }

  @Put(':menuId/items/:id')
  @ResponseMessage('Menu item updated successfully')
  updateMenuItem(@Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    return this.menuItemService.update(id, dto);
  }

  @Delete(':menuId/items')
  @ResponseMessage('Menu item deleted successfully')
  deleteMenuItem(@Body() dto: DeleteMenuItemDto) {
    return this.menuItemService.remove(dto.ids);
  }
}
