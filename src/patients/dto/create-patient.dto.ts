import {IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, Matches} from 'class-validator';
 
export class CreatePatientDto {
    @IsString()
    @IsNotEmpty({ message: 'First name is required' })
    firstName: string

    @IsString()
    @IsNotEmpty({ message: 'Last name is required' })
    lastName: string

    @IsString()
    @IsNotEmpty({ message: 'CNIC is required' })
    @Matches(/^\d{5}-\d{7}-\d{1}$/,{message: `CNIC must be in format 00000-0000000-0 `})
    cnic: string

    @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;

  @IsDateString({}, { message: 'Invalid date format for Date of Birth' })
  @IsNotEmpty({ message: 'Date of birth is required' })
  dob: string;

  @IsString()
  @IsNotEmpty({ message: 'Gender is required' })
  gender: string;

  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @IsString()
  @IsOptional()
  emergencyContact?: string;
}