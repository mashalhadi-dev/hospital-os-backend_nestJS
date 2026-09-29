import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { LoginDto } from './dto/login.dto.js'; // <- Yeh import karein
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('This email is already registered!');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
        role: createUserDto.role || 'PATIENT',
      },
    });

    const { password, ...result } = user;
    return {
      message: 'User Registered Successfully!',
      user: result,
    };
  }

  // Yahan naya login function add karein
  async login(loginDto: LoginDto) {
    // 1. Check karein ke user database mein exist karta hai ya nahi
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 2. Password match karein
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Password hata kar token aur user details return karein
    const { password, ...result } = user;
    
    return {
      message: 'Login Successful!',
      token: 'sample-jwt-token-xyz', // Agar aapne abhi JWT module setup nahi kiya toh temporary token bhej sakte hain, warna JwtService use kar sakte hain
      user: result,
    };
  }
}