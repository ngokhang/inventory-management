import { Prisma } from 'prisma/generated/client';

export interface ProductDetailResponse {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  category: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
  } | null;
  attributes: ProductAttributeResponse[];
  images: ProductImageResponse[];
  variants: ProductVariantResponse[];
}

export interface ProductAttributeResponse {
  attributeTypeId: string;
  attributeTypeName: string;
}

export interface ProductImageResponse {
  id: string;
  url: string;
  altText: string | null;
  isMain: boolean;
  sortOrder: number;
}

export interface ProductVariantResponse {
  id: string;
  slug: string;
  sku: string;
  name: string;
  inputPrice: string;
  sellingPrice: string;
  stock: number;
  isActive: boolean;
  attributes: ProductVariantAttributeResponse[];
  images: ProductImageResponse[];
}

export interface ProductVariantAttributeResponse {
  attributeTypeId: string;
  attributeTypeName: string;
  attributeValueId: string;
  attributeValue: string;
}

export const productDetailInclude = {
  productCategory: true,
  attributes: {
    include: {
      attributeType: true,
    },
  },
  productImages: true,
  productVariants: {
    include: {
      productImages: true,
      attributes: {
        include: {
          attributeValue: {
            include: {
              attributeType: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProductInclude;

export type ProductDetailRaw = Prisma.ProductGetPayload<{
  include: typeof productDetailInclude;
}>;
