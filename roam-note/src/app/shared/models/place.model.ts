export interface Place {
  readonly id: number;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
}

export interface PlaceInsert {
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
}

export interface PlaceUpdate {
  readonly name?: string;
  readonly latitude?: number;
  readonly longitude?: number;
}
