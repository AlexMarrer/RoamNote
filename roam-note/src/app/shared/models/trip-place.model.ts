export interface TripPlace {
  readonly id: number;
  readonly trip_id: number;
  readonly place_id: number;
  readonly visit_order: number;
  readonly arrival_date?: string;
  readonly departure_date?: string;
  readonly is_alert_active: boolean;
  readonly note?: string;
}

export interface TripPlaceInsert {
  readonly trip_id: number;
  readonly place_id: number;
  readonly visit_order: number;
  readonly arrival_date?: string;
  readonly departure_date?: string;
  readonly is_alert_active?: boolean;
  readonly note?: string;
}

export interface TripPlaceUpdate {
  readonly visit_order?: number;
  readonly arrival_date?: string;
  readonly departure_date?: string;
  readonly is_alert_active?: boolean;
  readonly note?: string;
}

export interface TripPlaceWithDetails extends TripPlace {
  readonly place_name: string;
  readonly place_latitude: number;
  readonly place_longitude: number;
}
