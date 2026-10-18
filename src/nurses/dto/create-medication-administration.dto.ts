import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateMedicationAdministrationDto {
  @IsUUID()
  prescriptionItemId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
