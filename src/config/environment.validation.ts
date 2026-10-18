import { plainToInstance, Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  DIRECT_URL!: string;

  @IsString()
  @MinLength(32)
  JWT_SECRET!: string;

  @Transform(({ value }: { value: unknown }) =>
    value === undefined || value === '' ? 3000 : Number(value),
  )
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @Transform(({ value }: { value: unknown }) =>
    value === undefined || value === '' ? 3600 : Number(value),
  )
  @IsInt()
  @Min(1)
  @Max(86400)
  JWT_EXPIRES_IN_SECONDS!: number;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGINS!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @IsNotEmpty()
  REDIS_URL?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @IsNotEmpty()
  REDIS_HOST?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === undefined || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT?: number;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  REDIS_USERNAME?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @IsString()
  REDIS_TLS?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @IsNotEmpty()
  STAFF_REGISTRATION_SECRET?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @IsNotEmpty()
  GEMINI_API_KEY?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @IsNotEmpty()
  GEMINI_MODEL?: string;
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const validated = plainToInstance(EnvironmentVariables, {
    ...environment,
    PORT: environment.PORT || '3000',
    JWT_EXPIRES_IN_SECONDS: environment.JWT_EXPIRES_IN_SECONDS || '3600',
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  const messages = errors.flatMap((error) =>
    Object.values(error.constraints ?? {}),
  );
  if (messages.length > 0) {
    throw new Error(`Invalid environment configuration: ${messages.join('; ')}`);
  }

  if (Buffer.byteLength(validated.JWT_SECRET, 'utf8') < 32) {
    throw new Error('JWT_SECRET must contain at least 32 UTF-8 bytes');
  }

  const origins = validated.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0 || origins.includes('*')) {
    throw new Error('CORS_ORIGINS must contain explicit frontend origins');
  }

  if (
    validated.REDIS_TLS !== undefined &&
    !['true', 'false'].includes(validated.REDIS_TLS)
  ) {
    throw new Error('REDIS_TLS must be either true or false');
  }

  if (validated.REDIS_URL) {
    let redisUrl: URL;
    try {
      redisUrl = new URL(validated.REDIS_URL);
    } catch (error) {
      throw new Error('REDIS_URL must be a valid redis:// or rediss:// URL', {
        cause: error,
      });
    }
    if (
      !['redis:', 'rediss:'].includes(redisUrl.protocol) ||
      !redisUrl.hostname
    ) {
      throw new Error(
        'REDIS_URL must use redis:// or rediss:// and include a host',
      );
    }
  } else if (!validated.REDIS_HOST || validated.REDIS_PORT === undefined) {
    throw new Error(
      'Configure Redis with REDIS_URL or with both REDIS_HOST and REDIS_PORT',
    );
  }

  return Object.fromEntries(Object.entries(validated));
}
