import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateDoctorDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/)
  specialization?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  availability?: string | null;
}
