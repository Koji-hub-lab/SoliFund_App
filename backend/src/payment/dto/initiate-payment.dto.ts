import { IsInt, IsOptional, IsString } from 'class-validator';

export class InitiatePaymentDto {
  @IsInt()
  donationId: number;

  @IsOptional()
  @IsString()
  payerMessage?: string;

  @IsOptional()
  @IsString()
  payeeNote?: string;
}
