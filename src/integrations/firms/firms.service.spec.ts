import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { FirmsService } from './firms.service';
import { BadGatewayException, Logger } from '@nestjs/common';
import {firstValueFrom, of} from 'rxjs';

describe('FirmsService', () => {
  let service: FirmsService;
  let httpService: HttpService;
const ORIGINAL_ENV = process.env;

    beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV, FIRMS_MAP_KEY: 'test-key' };
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirmsService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FirmsService>(FirmsService);
    httpService = module.get<HttpService>(HttpService);
  });

    afterEach(() => {
        process.env = ORIGINAL_ENV;
    });

    it('throws error when FIRMS_MAP_KEY is missing', async () => {
        process.env.FIRMS_MAP_KEY = '';

        await expect(service.fetchWildfires(37.422, -122.084))
            .rejects.toThrow('FIRMS_MAP_KEY missing');
    });


    it('fetches wildfire data successfully', async () => {    

        const csv = [
            'latitude,longitude,acq_date,acq_time',
            '37.422,-122.084,2026-01-26,1200',
            '37.423,-122.085,2026-01-26,1210',
        ].join('\n');

        jest.spyOn(httpService, 'get')
            .mockReturnValueOnce(of({ data: csv, status: 200, statusText: 'OK', headers: {}, config: {} } as any))
            .mockReturnValueOnce(of({ data: 'latitude,longitude,acq_date,acq_time\n', status: 200, statusText: 'OK', headers: {}, config: {} } as any));


        const result = await service.fetchWildfires(37.422, -122.084);

        expect(result.count).toBe(2);
        expect(result.records).toHaveLength(2);
    });


    it('returns empty records when CSV has only headers (no events)', async () => {
        const headerOnly = 'latitude,longitude,acq_date,acq_time\n';

        jest.spyOn(httpService, 'get').mockReturnValue(
            of({ data: headerOnly, status: 200, statusText: 'OK', headers: {}, config: {} } as any),
        );

        const result = await service.fetchWildfires(37.422, -122.084);

        expect(result.count).toBe(0);
        expect(result.records).toHaveLength(0);
    });


    it('throws BadGatewayException when FIRMS API fails', async () => {
    jest.spyOn(httpService, 'get').mockImplementation(() => {
      throw new Error('Network error');
    });

    await expect(service.fetchWildfires(37.422, -122.084)).rejects.toThrow(BadGatewayException);
  });

  it('throws error when FIRMS_MAP_KEY is missing', async () => {
    process.env.FIRMS_MAP_KEY = '';

    await expect(service.fetchWildfires(37.422, -122.084)).rejects.toThrow('FIRMS_MAP_KEY missing');
  });

  it('parses CSV correctly into JSON objects', () => {
    const csvText = 'latitude,longitude\n37.422,-122.084\n37.423,-122.085';

    const result = (service as any).parseCsv(csvText);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ latitude: '37.422', longitude: '-122.084' });
  });

  it('returns empty array when parsing empty CSV', () => {
    const result = (service as any).parseCsv('');

    expect(result).toHaveLength(0);
  });

  // TypeScript
  it('calculates bounding box correctly', () => {
    const bbox = (service as any).bboxFromLatLng(37.422, -122.084, 0.1);
    const parts = bbox.split(',').map((s: string) => parseFloat(s));
  
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBeCloseTo(-122.184, 6);
    expect(parts[1]).toBeCloseTo(37.322, 6);
    expect(parts[2]).toBeCloseTo(-121.984, 6);
    expect(parts[3]).toBeCloseTo(37.522, 6);
  });
});