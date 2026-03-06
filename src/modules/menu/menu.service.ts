import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'prisma/generated/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

const menuSelect = {
  id: true,
  name: true,
  description: true,
  iconUrl: true,
  position: true,
  requiredRoles: true,
  menuItems: {
    select: {
      id: true,
      name: true,
      iconUrl: true,
      href: true,
      parentId: true,
      requiredRoles: true,
      isActive: true,
      sortOrder: true,
    },
  },
} as const;

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMenuDto) {
    try {
      return await this.prisma.menu.create({
        data: { ...dto },
        select: menuSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Menu already exists');
      }
      throw error;
    }
  }

  async findAll(dto: PaginationQueryDto) {
    const { page, limit, q } = dto;
    const skip = ((page ?? 1) - 1) * (limit ?? 10);
    const where: Prisma.MenuWhereInput = {
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    };

    const [totalCount, menuList] = await Promise.all([
      this.prisma.menu.count({
        where,
      }),
      this.prisma.menu.findMany({
        select: menuSelect,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        where,
      }),
    ]);

    return {
      data: menuList,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / (limit ?? 10)),
    };
  }

  async update(id: string, dto: UpdateMenuDto) {
    try {
      if (Object.keys(dto).length === 0)
        throw new BadRequestException('No data to update');
      return await this.prisma.menu.update({
        where: { id },
        data: { ...dto },
        select: menuSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Menu not found');
      }
      throw error;
    }
  }

  async remove(id: string | string[]) {
    const ids = Array.isArray(id) ? id : [id];

    const { count } = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.menu.findMany({
        where: { id: { in: ids } },
        select: { id: true },
      });

      if (existing.length !== ids.length)
        throw new NotFoundException('Some menus not found');

      return tx.menu.deleteMany({
        where: { id: { in: ids } },
      });
    });

    return {
      deletedCount: count,
    };
  }
}
