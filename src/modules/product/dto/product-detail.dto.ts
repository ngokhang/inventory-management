import { Decimal } from '@prisma/client/runtime/client';
import { Expose, Transform, Type } from 'class-transformer';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function getRecordField(value: unknown, key: string): UnknownRecord | null {
  if (!isRecord(value)) return null;
  const field = value[key];
  return isRecord(field) ? field : null;
}

function getStringField(value: unknown, key: string): string {
  if (!isRecord(value)) return '';
  const field = value[key];
  return typeof field === 'string' ? field : '';
}

export class DecimalNumber extends Decimal {
  constructor(value = 0) {
    super(value);
  }
}

class ProductCategoryDto {
  @Expose()
  id!: string;

  @Expose()
  slug!: string;

  @Expose()
  name!: string;

  @Expose()
  description!: string | null;
}

class ProductAttributeDto {
  @Expose()
  @Transform(
    ({ obj }) => {
      const attributeType = getRecordField(obj, 'attributeType');
      return getStringField(attributeType, 'id');
    },
    { toClassOnly: true },
  )
  attributeTypeId!: string;

  @Expose()
  @Transform(
    ({ obj }) => {
      const attributeType = getRecordField(obj, 'attributeType');
      return getStringField(attributeType, 'name');
    },
    { toClassOnly: true },
  )
  attributeTypeName!: string;
}

class ProductImageDto {
  @Expose()
  id!: string;

  @Expose()
  url!: string;

  @Expose()
  altText!: string | null;

  @Expose()
  isMain!: boolean;

  @Expose()
  sortOrder!: number;
}

class ProductVariantAttributeDto {
  @Expose()
  @Transform(
    ({ obj }) => {
      const attributeValue = getRecordField(obj, 'attributeValue');
      const attributeType = getRecordField(attributeValue, 'attributeType');
      return getStringField(attributeType, 'name');
    },
    {
      toClassOnly: true,
    },
  )
  attributeTypeName!: string;

  @Expose()
  @Transform(
    ({ obj }) => {
      const attributeValue = getRecordField(obj, 'attributeValue');
      return getStringField(attributeValue, 'value');
    },
    { toClassOnly: true },
  )
  attributeValue!: string;
}

class ProductVariantDto {
  @Expose()
  id!: string;

  @Expose()
  slug!: string;

  @Expose()
  sku!: string;

  @Expose()
  name!: string;

  @Expose()
  @Type(() => DecimalNumber)
  @Transform(
    ({ obj }) => {
      if (!isRecord(obj)) return 0;
      return obj.inputPrice ?? 0;
    },
    { toClassOnly: true },
  )
  inputPrice!: DecimalNumber;

  @Expose()
  @Type(() => DecimalNumber)
  @Transform(
    ({ obj }) => {
      if (!isRecord(obj)) return 0;
      return obj.sellingPrice ?? 0;
    },
    { toClassOnly: true },
  )
  sellingPrice!: DecimalNumber;

  @Expose()
  stock!: number;

  @Expose()
  isActive!: boolean;

  @Expose()
  @Type(() => ProductVariantAttributeDto)
  attributes!: ProductVariantAttributeDto[];

  @Expose({ name: 'productImages' })
  @Type(() => ProductImageDto)
  images!: ProductImageDto[];
}

export class ProductDetailDto {
  @Expose()
  id!: string;

  @Expose()
  slug!: string;

  @Expose()
  name!: string;

  @Expose()
  description!: string | null;

  @Expose()
  isActive!: boolean;

  @Expose({ name: 'productCategory' })
  @Type(() => ProductCategoryDto)
  category!: ProductCategoryDto | null;

  @Expose()
  @Type(() => ProductAttributeDto)
  attributes!: ProductAttributeDto[];

  @Expose({ name: 'productImages' })
  @Type(() => ProductImageDto)
  images!: ProductImageDto[];

  @Expose({ name: 'productVariants' })
  @Type(() => ProductVariantDto)
  variants!: ProductVariantDto[];
}
