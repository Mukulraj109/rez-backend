export interface GeocodeResult {
    address: string;
    city: string;
    state: string;
    country: string;
    pincode?: string;
    coordinates: [number, number];
    timezone?: string;
    formattedAddress: string;
}
export interface GeocodeRequest {
    latitude: number;
    longitude: number;
}
export interface SearchAddressRequest {
    query: string;
    limit?: number;
}
export interface AddressSearchResult {
    address: string;
    coordinates: [number, number];
    formattedAddress: string;
    placeId?: string;
}
declare class GeocodingService {
    private googleMapsApiKey;
    private openCageApiKey;
    private useGoogleMaps;
    constructor();
    /**
     * Reverse geocoding - Convert coordinates to address
     */
    reverseGeocode(request: GeocodeRequest): Promise<GeocodeResult>;
    /**
     * Google Maps reverse geocoding
     */
    private reverseGeocodeGoogle;
    /**
     * OpenCage reverse geocoding (fallback)
     */
    private reverseGeocodeOpenCage;
    /**
     * Search addresses by query
     */
    searchAddresses(request: SearchAddressRequest): Promise<AddressSearchResult[]>;
    /**
     * Google Places API address search
     */
    private searchAddressesGoogle;
    /**
     * OpenCage address search
     */
    private searchAddressesOpenCage;
    /**
     * Get timezone for coordinates
     */
    getTimezone(latitude: number, longitude: number): Promise<string>;
    /**
     * Google Maps timezone API
     */
    private getTimezoneGoogle;
    /**
     * Simple timezone estimation based on longitude
     */
    private estimateTimezone;
    /**
     * Validate if coordinates are valid
     */
    validateCoordinates(latitude: number, longitude: number): boolean;
    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
    private toRadians;
}
export declare const geocodingService: GeocodingService;
export {};
