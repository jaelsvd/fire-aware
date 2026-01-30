import { Test } from '@nestjs/testing';
import {InternalServerErrorException, UnprocessableEntityException} from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';

import { AddressesService } from './addresses.service';
import { Address } from './address.model';
import { GoogleGeocodingService } from '../integrations/google/geocoding.service';
import { FirmsService } from '../integrations/firms/firms.service';

describe('AddressesService', () => {
  let service: AddressesService;

  const addressModelMock = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const googleMock = {
    geocode: jest.fn(),
  };

  const firmsMock = {
    fetchWildfires: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AddressesService,
        { provide: getModelToken(Address), useValue: addressModelMock },
        { provide: GoogleGeocodingService, useValue: googleMock },
        { provide: FirmsService, useValue: firmsMock },
      ],
    }).compile();

    service = moduleRef.get(AddressesService);
  });

  it('returns cached address (cache hit) and does not call external services', async () => {
    const cached = {
      id: 'uuid-1',
      address: '1600 Amphitheatre Parkway, Mountain View, CA',
      addressNormalized: '1600 amphitheatre parkway, mountain view, ca',
      latitude: 37.422,
      longitude: -122.084,
    };

    addressModelMock.findOne.mockResolvedValue(cached);

    const result = await service.create('1600 Amphitheatre Parkway, Mountain View, CA');

    expect(result).toEqual(cached);
    expect(addressModelMock.findOne).toHaveBeenCalledTimes(1);
    expect(googleMock.geocode).not.toHaveBeenCalled();
    expect(firmsMock.fetchWildfires).not.toHaveBeenCalled();
  });

  it('creates a new address (cache miss), calls Google + FIRMS, and saves wildfire data', async () => {
    addressModelMock.findOne.mockResolvedValue(null);

    googleMock.geocode.mockResolvedValue({
      lat: 37.422,
      lng: -122.084,
      raw: { results: [{ geometry: { location: { lat: 37.422, lng: -122.084 } } }] },
    });

    firmsMock.fetchWildfires.mockResolvedValue({
      count: 2,
      records: [{ foo: '1' }, { foo: '2' }],
      bbox: 'bbox',
      rangeDays: 7,
      source: 'VIIRS_SNPP_NRT',
    });

    const addressInstance = {
      id: 'uuid-new',
      address: '1600 Amphitheatre Parkway, Mountain View, CA',
      addressNormalized: '1600 amphitheatre parkway, mountain view, ca',
      latitude: 37.422,
      longitude: -122.084,
      wildfireData: { count: 0, records: [], bbox: '', rangeDays: 7 },
      wildfireFetchedAt: null as any,
      save: jest.fn().mockResolvedValue(true),
    };

    addressModelMock.create.mockResolvedValue(addressInstance);

    const result = await service.create('1600 Amphitheatre Parkway, Mountain View, CA');

    expect(addressModelMock.findOne).toHaveBeenCalledTimes(1);
    expect(googleMock.geocode).toHaveBeenCalledTimes(1);
    expect(firmsMock.fetchWildfires).toHaveBeenCalledWith(37.422, -122.084);

    expect(addressInstance.save).toHaveBeenCalledTimes(1);
    expect(result.wildfireData.count).toBe(2);
    expect(result.wildfireFetchedAt).toBeInstanceOf(Date);
  });

  it('throws 422 when Google service throws UnprocessableEntityException', async () => {
    addressModelMock.findOne.mockResolvedValue(null);

    googleMock.geocode.mockRejectedValue(
        new InternalServerErrorException('Address could not be geocoded'),
    );

    await expect(service.create('weird address')).rejects.toBeInstanceOf(
        InternalServerErrorException,
    );

    expect(googleMock.geocode).toHaveBeenCalledTimes(1);
    expect(firmsMock.fetchWildfires).not.toHaveBeenCalled();
    expect(addressModelMock.create).not.toHaveBeenCalled();
  });
});
