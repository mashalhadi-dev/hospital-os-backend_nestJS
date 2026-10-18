import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AskReceptionistAiDto } from './ask-receptionist-ai.dto.js';

describe('AskReceptionistAiDto', () => {
  it('accepts a predefined administrative task without free-text fields', async () => {
    const dto = plainToInstance(AskReceptionistAiDto, {
      task: 'APPOINTMENT_REMINDER',
    });

    await expect(
      validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toHaveLength(0);
  });

  it('rejects arbitrary tasks and patient context', async () => {
    const dto = plainToInstance(AskReceptionistAiDto, {
      task: 'SUMMARIZE_PATIENT',
      patientId: 'not-accepted-by-this-endpoint',
      prompt: 'Include patient details',
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(3);
  });
});
