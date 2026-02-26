import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../authz/guards/roles.guard';
import { PermissionsGuard } from '../authz/guards/permissions.guard';
import { Roles } from '../authz/decorators/roles.decorator';
import { Permissions } from '../authz/decorators/permissions.decorator';
import { Role } from 'prisma/generated/enums';
import { Permission } from '../authz/constants/permission.constant';

@Controller('users')
@UseGuards(AccessTokenGuard, RolesGuard, PermissionsGuard)
@Roles(Role.ADMIN)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Permissions(Permission.USER_CREATE)
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  @Permissions(Permission.USER_READ)
  findAll(@Query() query: PaginationQueryDto) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  @Permissions(Permission.USER_READ)
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @Permissions(Permission.USER_UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(Permission.USER_DELETE)
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
