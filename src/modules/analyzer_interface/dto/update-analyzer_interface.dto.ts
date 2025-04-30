import { PartialType } from '@nestjs/swagger';
import { CreateAnalyzerInterfaceDto } from './create-analyzer_interface.dto';

export class UpdateAnalyzerInterfaceDto extends PartialType(CreateAnalyzerInterfaceDto) {}
