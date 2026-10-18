import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AskAiDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  prompt?: string;
}
