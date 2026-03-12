import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ProductCategoryService } from "./product-category.service";
import { CreateProductCategoryDto } from "./dto/create-product-category.dto";
import { UpdateProductCategoryDto } from "./dto/update-product-category.dto";
import { DeleteProductCategoryDto } from "./dto/delete-product-category.dto";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import { Paginated } from "src/decorators/paginated.decorator";

@Controller("product-categories")
export class ProductCategoryController {
  constructor(
    private readonly productCategoryService: ProductCategoryService
  ) {}

  @Get()
  @Paginated()
  findAll(@Query() query: PaginationQueryDto) {
    return this.productCategoryService.findAll(query);
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.productCategoryService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductCategoryDto) {
    return this.productCategoryService.create(dto);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductCategoryDto,
  ) {
    return this.productCategoryService.update(id, dto);
  }

  @Post("batch-delete")
  delete(@Body() dto: DeleteProductCategoryDto) {
    return this.productCategoryService.delete(dto);
  }
}