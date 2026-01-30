"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var GoogleGeocodingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleGeocodingService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let GoogleGeocodingService = GoogleGeocodingService_1 = class GoogleGeocodingService {
    logger = new common_1.Logger(GoogleGeocodingService_1.name);
    timeoutMs = 8000;
    async geocode(address) {
        const key = process.env.GOOGLE_GEOCODING_API_KEY;
        if (!key)
            throw new Error('GOOGLE_GEOCODING_API_KEY missing');
        const normalized = address?.trim();
        if (!normalized) {
            throw new common_1.UnprocessableEntityException('Address is required');
        }
        let res;
        try {
            res = await axios_1.default.get('https://maps.googleapis.com/maps/api/geocode/json', {
                params: { address: normalized, key },
                timeout: this.timeoutMs,
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error('GoogleGeocodingService - Error calling provider', msg);
            throw new common_1.BadGatewayException('Geocoding provider unavailable');
        }
        if (!res.data.results?.length || !res.data.results?.[0]?.geometry?.location) {
            this.logger.error(`GoogleGeocodingService - Unexpected response status ${res.status}`);
            throw new common_1.UnprocessableEntityException('Geocoding provider returned an unexpected response');
        }
        const first = res.data.results?.[0];
        const loc = first?.geometry?.location;
        const lat = Number(loc?.lat);
        const lng = Number(loc?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            this.logger.warn('GoogleGeocodingService - Address could not be geocoded', { lat: loc?.lat, lng: loc?.lng });
            throw new common_1.UnprocessableEntityException('Address could not be geocoded');
        }
        return { lat, lng, raw: res.data };
    }
};
exports.GoogleGeocodingService = GoogleGeocodingService;
exports.GoogleGeocodingService = GoogleGeocodingService = GoogleGeocodingService_1 = __decorate([
    (0, common_1.Injectable)()
], GoogleGeocodingService);
//# sourceMappingURL=geocoding.service.js.map