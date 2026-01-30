import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';

// Addresses Controller
@Controller('addresses')
export class AddressesController {
  private readonly logger = new Logger(AddressesController.name);

  constructor(private readonly addressesService: AddressesService) {}

  /**
   * Create a new address.
   *
   * @param dto - Data Transfer Object containing the address details
   * @returns The created address
   * @example
   * const address = await controller.create({ address: "1600 Amphitheatre Parkway, Mountain View, CA" });
   */
  @Post()
  async create(@Body() dto: CreateAddressDto) {
    if (!dto || !dto.address.trim()) {
      this.logger.error(
        `Invalid create address payload: ${JSON.stringify(dto)}`,
      );
      throw new BadRequestException('Address is required');
    }

    try {
      return await this.addressesService.create(dto.address);
    } catch (err: unknown) {
      this.logger.error(
        'Failed to create address',
        (err && (err as any).stack) ||
          (err && (err as any).message) ||
          String(err),
      );
      throw err;
    }
  }

  /**
   * List all addresses with pagination.
   * @param limit - Maximum number of items to return
   * @param offset - Offset of the first item to return
   * @returns
   * @example
   *     "total": 1,
   *     "limit": 20,
   *     "offset": 0,
   *     "items": [...addresses]
   */
  @Get()
  async list(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const parsedLimit = Number(limit);
    const parsedOffset = Number(offset);

    const take =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 20;

    const skip =
      Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

    this.logger.log(`List addresses limit=${take} offset=${skip}`);

    return this.addressesService.findAllPaginated({
      limit: take,
      offset: skip,
    });
  }

  /**
   * Get an address by ID.
   * @param id - The ID of the address to get
   * @returns The address record
   * @throws NotFoundException if the address is not found
   * @example
   * const address = await controller.findById('123');
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    if (!id || !id.trim()) {
      this.logger.error(`Invalid id param: ${JSON.stringify(id)}`);
      throw new BadRequestException('Id is required');
    }

    let address;
    try {
      address = await this.addressesService.findById(id);
    } catch (err: unknown) {
      this.logger.error(
        'Failed to get address',
        (err && (err as any).stack) ||
          (err && (err as any).message) ||
          String(err),
      );
      throw err;
    }

    if (!address) {
      this.logger.warn(`Address not found id=${id}`);
      throw new NotFoundException({ message: 'Address not found', id });
    }

    return address;
  }
}
