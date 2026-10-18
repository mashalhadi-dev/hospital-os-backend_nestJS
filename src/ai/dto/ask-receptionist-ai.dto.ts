import { IsEnum } from 'class-validator';
import { ReceptionistAiTask } from './receptionist-ai-task.enum.js';

export class AskReceptionistAiDto {
  @IsEnum(ReceptionistAiTask)
  task!: ReceptionistAiTask;
}
