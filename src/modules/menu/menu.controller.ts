import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { Paginated } from 'src/decorators/paginated.decorator';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { DeleteMenuDto } from './dto/delete-menu.dto';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { RolesGuard } from 'src/authz/guards/roles.guard';
import { PermissionsGuard } from 'src/authz/guards/permissions.guard';
import { Roles } from 'src/authz/decorators/roles.decorator';
import { Role } from 'prisma/generated/enums';

@Controller('menus')
@UseGuards(AccessTokenGuard, RolesGuard, PermissionsGuard)
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @Paginated()
  @ResponseMessage('Menus fetched successfully')
  @Roles([Role.ADMIN])
  findAllMenus(@Query() dto: PaginationQueryDto) {
    return this.menuService.findAll(dto);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ResponseMessage('Menu created successfully')
  createMenu(@Body() dto: CreateMenuDto) {
    return this.menuService.create(dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ResponseMessage('Menu updated successfully')
  updateMenu(@Param('id') id: string, @Body() dto: UpdateMenuDto) {
    return this.menuService.update(id, dto);
  }

  @Delete()
  @Roles(Role.ADMIN)
  @ResponseMessage('Menus deleted successfully')
  delete(@Body() dto: DeleteMenuDto) {
    return this.menuService.remove(dto.ids);
  }
}
