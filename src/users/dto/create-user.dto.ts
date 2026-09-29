import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength} from 'class-validator'
import {Role} from '@prisma/client'

export class CreateUserDto{
    @IsEmail()
    email: string

    @IsString()
    @IsNotEmpty()
    @MinLength(6,{message:'password should be 6 characters atleast'})
    password:string
    @IsEnum(Role)
    role?: Role
}
