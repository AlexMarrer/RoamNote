export interface Trip {
  readonly id: number;
  readonly name: string;
  readonly note?: string;
  readonly start_date?: string;
  readonly end_date?: string;
  readonly created_at: string;
}

export interface TripInsert {
  readonly name: string;
  readonly note?: string;
  readonly start_date?: string;
  readonly end_date?: string;
}

export interface TripUpdate {
  readonly name?: string;
  readonly note?: string;
  readonly start_date?: string;
  readonly end_date?: string;
}
