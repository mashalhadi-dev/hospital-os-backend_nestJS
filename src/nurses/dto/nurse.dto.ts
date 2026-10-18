import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateNurseDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/)
  department!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  shift?: string;
}

export class UpdateNurseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  shift?: string | null;
}
