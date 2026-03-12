import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { DeleteProductCategoryDto } from './dto/delete-product-category.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Prisma } from 'prisma/generated/client';
import { createSlug } from '../product.utils';

const LIST_SELECT = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.ProductCategorySelect;

const DETAIL_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  products: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.ProductCategorySelect;

@Injectable()
export class ProductCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: PaginationQueryDto) {
    const { q, page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductCategoryWhereInput = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.productCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: LIST_SELECT,
      }),
      this.prisma.productCategory.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
      select: DETAIL_SELECT,
    });

    if (!category) {
      throw new NotFoundException(
        `ProductCategory với ID "${id}" không tồn tại`,
      );
    }

    return category;
  }

  async create(dto: CreateProductCategoryDto) {
    const { categories } = dto;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const slugs = categories.map((c) => c.slug || createSlug(c.name));

        const existingSlugs = await tx.productCategory.findMany({
          where: { slug: { in: slugs } },
          select: { slug: true },
        });

        if (existingSlugs.length > 0) {
          throw new BadRequestException(
            `Slug đã tồn tại: ${existingSlugs.map((s) => s.slug).join(', ')}`,
          );
        }

        return await tx.productCategory.createMany({
          data: categories.map((item) => ({
            name: item.name,
            slug: item.slug || createSlug(item.name),
            description: item.description,
          })),
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Slug đã tồn tại');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductCategoryDto) {
    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.productCategory.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(
          `ProductCategory với ID "${id}" không tồn tại`,
        );
      }

      if (dto.slug) {
        const slugExists = await tx.productCategory.findUnique({
          where: { slug: dto.slug },
        });

        if (slugExists && slugExists.id !== id) {
          throw new BadRequestException(`Slug "${dto.slug}" đã tồn tại`);
        }
      }

      return await tx.productCategory.update({
        where: { id },
        data: {
          name: dto.name,
          slug: dto.slug ?? (dto.name ? createSlug(dto.name) : undefined),
          description: dto.description,
        },
        select: DETAIL_SELECT,
      });
    });
  }

  async delete(dto: DeleteProductCategoryDto) {
    const { ids } = dto;

    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.productCategory.findMany({
        where: { id: { in: ids } },
        select: { id: true },
      });

      if (existing.length !== ids.length) {
        const foundIds = new Set(existing.map((e) => e.id));
        const missingIds = ids.filter((id) => !foundIds.has(id));
        throw new NotFoundException(
          `ProductCategory không tồn tại: ${missingIds.join(', ')}`,
        );
      }

      const linkedProducts = await tx.product.count({
        where: { productCategoryId: { in: ids } },
      });

      if (linkedProducts > 0) {
        throw new BadRequestException(
          `Không thể xoá vì có ${linkedProducts} sản phẩm đang liên kết. ` +
            `Hãy gỡ liên kết hoặc chuyển category cho các sản phẩm trước.`,
        );
      }

      const result = await tx.productCategory.deleteMany({
        where: { id: { in: ids } },
      });

      return {
        message: `Đã xoá ${result.count} ProductCategory`,
        count: result.count,
      };
    });
  }
}
