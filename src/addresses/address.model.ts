import {
  Table,
  Column,
  Model,
  PrimaryKey,
  Default,
  DataType,
  AllowNull,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';

type FirmsRecordJson = {
  area: string;
  data_availability: string; // ISO string
  kml_fire_footprints: Record<string, string[]>; // no Map, no Date
  map_key: string;
  missing_dates: string[];
};

@Table({ tableName: 'addresses', timestamps: true })
export class Address extends Model<Address> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING })
  address!: string;

  @AllowNull(true)
  @Column({ type: DataType.FLOAT })
  latitude?: number;

  @AllowNull(true)
  @Column({ type: DataType.FLOAT })
  longitude?: number;

  @Default({})
  @Column({ type: DataType.JSONB })
  wildfireData!: {
    count: number;
    records: FirmsRecordJson[];
    bbox: string;
    rangeDays: number;
  };

  @AllowNull(true)
  @Column({ type: DataType.JSONB })
  geocodeRaw?: object;

  @AllowNull(true)
  @Column({ type: DataType.DATE })
  wildfireFetchedAt?: Date;

  @CreatedAt
  @Column
  createdAt: Date = new Date();

  @UpdatedAt
  @Column
  updatedAt: Date = new Date();

  @AllowNull(false)
  @Column({ type: DataType.STRING })
  addressNormalized!: string;
}
