import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  doctorId!: string;

  @IsDateString()
  appointmentDate!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  symptoms?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  notes?: string;
}
