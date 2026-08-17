import { PartialType } from '@nestjs/mapped-types';
import { CreateCagnotteDto } from './create-cagnotte.dto';

export class UpdateCagnotteDto extends PartialType(CreateCagnotteDto) {}