import { IsOptional, IsString, IsNumber, IsIn, Min, Max } from 'class-validator'
import { Transform, Type } from 'class-transformer'

export class QueryBusinessesDto {
  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsIn(['distance', 'rating'])
  sort?: 'distance' | 'rating'

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(200)
  pageSize?: number = 10
}
