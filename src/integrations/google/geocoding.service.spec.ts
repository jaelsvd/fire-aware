import { Test, TestingModule } from '@nestjs/testing';
import { GoogleGeocodingService } from './geocoding.service';
import { BadGatewayException, UnprocessableEntityException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');

describe('GoogleGeocodingService', () => {
  let service: GoogleGeocodingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleGeocodingService],
    }).compile();

    service = module.get<GoogleGeocodingService>(GoogleGeocodingService);
  });

  it('returns latitude and longitude for a valid address', async () => {
    process.env.GOOGLE_GEOCODING_API_KEY = 'test-key';
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        results: [
          {
            geometry: {
              location: { lat: 37.422, lng: -122.084 },
            },
          },
        ],
      },
    });

    const result = await service.geocode('1600 Amphitheatre Parkway, Mountain View, CA');

    expect(result).toEqual({
      lat: 37.422,
      lng: -122.084,
      raw: {
        results: [
          {
            geometry: {
              location: { lat: 37.422, lng: -122.084 },
            },
          },
        ],
      },
    });
  });

  it('throws error when GOOGLE_GEOCODING_API_KEY is missing', async () => {
    process.env.GOOGLE_GEOCODING_API_KEY = '';

    await expect(service.geocode('1600 Amphitheatre Parkway, Mountain View, CA')).rejects.toThrow(
      'GOOGLE_GEOCODING_API_KEY missing',
    );
  });

  it('throws BadGatewayException when API call fails', async () => {
    process.env.GOOGLE_GEOCODING_API_KEY = 'test-key';
    (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

    await expect(service.geocode('1600 Amphitheatre Parkway, Mountain View, CA')).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('throws UnprocessableEntityException when no results are returned', async () => {
    process.env.GOOGLE_GEOCODING_API_KEY = 'test-key';
    (axios.get as jest.Mock).mockResolvedValue({ data: { results: [] } });

    await expect(service.geocode('Invalid Address')).rejects.toThrow(UnprocessableEntityException);
  });

  it('throws UnprocessableEntityException when location data is missing', async () => {
    process.env.GOOGLE_GEOCODING_API_KEY = 'test-key';
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        results: [
          {
            geometry: {},
          },
        ],
      },
    });

    await expect(service.geocode('1600 Amphitheatre Parkway, Mountain View, CA')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('throws UnprocessableEntityException when coordinates are invalid', async () => {
    process.env.GOOGLE_GEOCODING_API_KEY = 'test-key';
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        results: [
          {
            geometry: {
              location: { lat: 'invalid', lng: 'invalid' },
            },
          },
        ],
      },
    });

    await expect(service.geocode('1600 Amphitheatre Parkway, Mountain View, CA')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });
});