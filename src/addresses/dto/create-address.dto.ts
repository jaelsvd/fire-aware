import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Data Transfer Object for creating a new address.
 * @example
 * const dto = new CreateAddressDto({ address: "1600 Amphitheatre Parkway, Mountain View, CA" });
 * const address = await controller.create(dto);
 */
export class CreateAddressDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  address!: string;
}
