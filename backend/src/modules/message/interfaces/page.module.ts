import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PageDocument,
  PageSchema,
} from 'src/modules/message/infrastructure/page.schema';
import { PageRepository } from 'src/modules/message/infrastructure/page.repository';
import { IPageRepository } from 'src/modules/message/domain/i-page.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PageDocument.name, schema: PageSchema },
    ]),
  ],
  controllers: [],
  providers: [{ provide: IPageRepository, useClass: PageRepository }],
  exports: [IPageRepository],
})
export class PageModule {}
