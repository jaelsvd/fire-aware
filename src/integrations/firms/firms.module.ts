import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FirmsService } from './firms.service';

@Module({
  imports: [HttpModule],
  providers: [FirmsService],
  exports: [FirmsService],
})
export class FirmsModule {}
