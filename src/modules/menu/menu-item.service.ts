import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { Prisma } from 'prisma/generated/client';

const menuItemSelect = {
  id: true,
  name: true,
  iconUrl: true,
  href: true,
  parentId: true,
  requiredRoles: true,
  isActive: true,
  sortOrder: true,
} as const;

@Injectable()
export class MenuItemService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMenuItemDto) {
    const menuItem = await this.prisma.menuItem.create({
      data: { ...dto },
      select: menuItemSelect,
    });

    return menuItem;
  }

  async update(id: string, dto: UpdateMenuItemDto) {
    try {
      return await this.prisma.menuItem.update({
        where: { id },
        data: { ...dto },
        select: menuItemSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Menu item not found');
      }
      throw error;
    }
  }

  async remove(id: string | string[]) {
    const ids = Array.isArray(id) ? id : [id];

    const { count } = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.menuItem.findMany({
        where: { id: { in: ids } },
      });

      if (existing.length !== ids.length)
        throw new NotFoundException('Some menu items not found');

      return tx.menuItem.deleteMany({
        where: { id: { in: ids } },
      });
    });

    return {
      deletedCount: count,
    };
  }
}
