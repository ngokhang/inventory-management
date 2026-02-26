import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from 'prisma/generated/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

const userSelect = {
  id: true,
  name: true,
  accountId: true,
  role: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
  account: {
    select: {
      id: true,
      username: true,
      email: true,
      provider: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const account = await this.prisma.account.findUnique({
      where: { id: dto.accountId },
      select: { id: true },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return this.prisma.user.create({
      data: {
        name: dto.name,
        accountId: dto.accountId,
        role: dto.role,
        avatarUrl: dto.avatarUrl,
      },
      select: userSelect,
    });
  }

  async findAll(query: PaginationQueryDto): Promise<PaginatedResponse<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const where = this.buildSearchWhere(query.q);

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
        select: userSelect,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private buildSearchWhere(q?: string): Prisma.UserWhereInput | undefined {
    if (!q) {
      return undefined;
    }

    const keyword = q.trim();
    if (!keyword) {
      return undefined;
    }

    return {
      OR: [
        {
          name: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
        {
          account: {
            username: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
        },
        {
          account: {
            email: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
        },
      ],
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        role: dto.role,
        avatarUrl: dto.avatarUrl,
      },
      select: userSelect,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.user.delete({
      where: { id },
      select: userSelect,
    });
  }
}
