export interface GooglePlaceResult {
  readonly place_id: string;
  readonly name: string;
  readonly formatted_address: string;
  readonly geometry: {
    readonly location: {
      readonly lat: number;
      readonly lng: number;
    };
  };
}

export interface GooglePlacePrediction {
  readonly place_id: string;
  readonly description: string;
  readonly structured_formatting: {
    readonly main_text: string;
    readonly secondary_text: string;
  };
}
