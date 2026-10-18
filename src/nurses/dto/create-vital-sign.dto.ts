import {
  IsInt,
  IsNumber,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateVitalSignDto {
  @IsUUID()
  patientId!: string;

  @IsInt()
  @Min(40)
  @Max(300)
  systolicBloodPressure!: number;

  @IsInt()
  @Min(20)
  @Max(200)
  diastolicBloodPressure!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  oxygenSaturation!: number;

  @IsInt()
  @Min(1)
  @Max(300)
  heartRate!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(25)
  @Max(45)
  temperatureCelsius!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(2000)
  bloodGlucoseMgDl!: number;
}
