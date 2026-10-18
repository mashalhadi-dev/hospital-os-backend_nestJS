import {
  IsNumber,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMedicineDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000000)
  price!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000000)
  stock?: number;
}

export class UpdateMedicineDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000000)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000000)
  stock?: number;
}
