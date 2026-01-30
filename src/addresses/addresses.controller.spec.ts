import { Test, TestingModule } from '@nestjs/testing';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { Address } from './address.model';
import { NotFoundException } from '@nestjs/common';

describe('AddressesController', () => {
  let controller: AddressesController;
  let service: jest.Mocked<AddressesService>;

  const mockAddressesService = {
    create: jest.fn(),
    findAllPaginated: jest.fn(),
    findById: jest.fn(),
  } as unknown as jest.Mocked<AddressesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressesController],
      providers: [
        {
          provide: AddressesService,
          useValue: mockAddressesService,
        },
      ],
    }).compile();

    controller = module.get<AddressesController>(AddressesController);
    service = module.get(AddressesService);
    jest.clearAllMocks();
  });

  it('creates a new address successfully', async () => {
    const dto: CreateAddressDto = { address: '1600 Amphitheatre Parkway' };

    const createdAddress = {
      id: '1',
      address: dto.address,
      latitude: 37.422,
      longitude: -122.084,
      wildfireData: { count: 0, records: [], bbox: '', rangeDays: 7 },
    };

    service.create.mockResolvedValue(createdAddress as unknown as Address);

    const result = await controller.create(dto);

    expect(result).toEqual(createdAddress);
    expect(service.create).toHaveBeenCalledWith(dto.address);
  });

  it('lists addresses with valid pagination parameters', async () => {
    const paginatedResult = {
      total: 1,
      limit: 20,
      offset: 0,
      items: [
        {
          id: '1',
          address: '1600 Amphitheatre Parkway',
          latitude: 37.422,
          longitude: -122.084,
        },
      ],
    };

    service.findAllPaginated.mockResolvedValue(paginatedResult as any);

    const result = await controller.list('20', '0');

    expect(result).toEqual(paginatedResult);
    expect(service.findAllPaginated).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
    });
  });

  it('returns a single address by id', async () => {
    const address = {
      id: '1',
      address: '1600 Amphitheatre Parkway',
      latitude: 37.422,
      longitude: -122.084,
      wildfireData: { count: 0, records: [], bbox: '', rangeDays: 7 },
    };

    service.findById.mockResolvedValue(address as unknown as Address);

    const result = await controller.findOne('1');

    expect(result).toEqual(address);
    expect(service.findById).toHaveBeenCalledWith('1');
  });

  it('propagates NotFoundException when address does not exist', async () => {
    service.findById.mockRejectedValue(
        new NotFoundException('Address not found'),
    );

    await expect(controller.findOne('1')).rejects.toThrow(NotFoundException);
    expect(service.findById).toHaveBeenCalledWith('1');
  });
});
