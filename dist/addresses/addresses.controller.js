"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AddressesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressesController = void 0;
const common_1 = require("@nestjs/common");
const addresses_service_1 = require("./addresses.service");
const create_address_dto_1 = require("./dto/create-address.dto");
let AddressesController = AddressesController_1 = class AddressesController {
    addressesService;
    logger = new common_1.Logger(AddressesController_1.name);
    constructor(addressesService) {
        this.addressesService = addressesService;
    }
    async create(dto) {
        if (!dto || !dto.address.trim()) {
            this.logger.error(`Invalid create address payload: ${JSON.stringify(dto)}`);
            throw new common_1.BadRequestException('Address is required');
        }
        try {
            return await this.addressesService.create(dto.address);
        }
        catch (err) {
            this.logger.error('Failed to create address', (err && err.stack) ||
                (err && err.message) ||
                String(err));
            throw err;
        }
    }
    async list(limit, offset) {
        const parsedLimit = Number(limit);
        const parsedOffset = Number(offset);
        const take = Number.isFinite(parsedLimit) && parsedLimit > 0
            ? Math.min(parsedLimit, 100)
            : 20;
        const skip = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
        this.logger.log(`List addresses limit=${take} offset=${skip}`);
        return this.addressesService.findAllPaginated({
            limit: take,
            offset: skip,
        });
    }
    async findOne(id) {
        if (!id || !id.trim()) {
            this.logger.error(`Invalid id param: ${JSON.stringify(id)}`);
            throw new common_1.BadRequestException('Id is required');
        }
        let address;
        try {
            address = await this.addressesService.findById(id);
        }
        catch (err) {
            this.logger.error('Failed to get address', (err && err.stack) ||
                (err && err.message) ||
                String(err));
            throw err;
        }
        if (!address) {
            this.logger.warn(`Address not found id=${id}`);
            throw new common_1.NotFoundException({ message: 'Address not found', id });
        }
        return address;
    }
};
exports.AddressesController = AddressesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_address_dto_1.CreateAddressDto]),
    __metadata("design:returntype", Promise)
], AddressesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AddressesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AddressesController.prototype, "findOne", null);
exports.AddressesController = AddressesController = AddressesController_1 = __decorate([
    (0, common_1.Controller)('addresses'),
    __metadata("design:paramtypes", [addresses_service_1.AddressesService])
], AddressesController);
//# sourceMappingURL=addresses.controller.js.map