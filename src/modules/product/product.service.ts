import { plainToInstance } from 'class-transformer';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductDetailDto } from './dto/product-detail.dto';
import { productDetailInclude } from './product.type';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async getDetail(slug: string): Promise<any> {
    const raw = await this.prisma.product.findUnique({
      where: { slug },
      include: productDetailInclude,
    });

    if (!raw) {
      throw new NotFoundException('Product not found');
    }

    return plainToInstance(ProductDetailDto, raw, {
      excludeExtraneousValues: true,
    });
  }
}
