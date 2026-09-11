import { Inject, Injectable } from '@nestjs/common';
import { IFileRepository } from 'src/modules/file/domain/i-file.repository';
import { FileEntity } from 'src/modules/file/domain/file.entity';
import { FileNotFoundException } from 'src/shared/exceptions/domain-exceptions';

@Injectable()
export class GetFileUseCase {
  constructor(
    @Inject(IFileRepository) private readonly fileRepository: IFileRepository,
  ) {}

  async execute(id: string): Promise<FileEntity> {
    const file = await this.fileRepository.findById(id);
    if (!file) throw new FileNotFoundException(id);
    return file;
  }
}
