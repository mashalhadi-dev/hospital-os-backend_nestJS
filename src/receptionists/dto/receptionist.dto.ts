import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateReceptionistDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  deskNumber?: string;
}

export class UpdateReceptionistDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  deskNumber?: string | null;
}
