"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.geocodingService = void 0;
const axios_1 = __importDefault(require("axios"));
class GeocodingService {
    constructor() {
        this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
        this.openCageApiKey = process.env.OPENCAGE_API_KEY || '';
        // Use OpenCage as primary since Google Maps requires billing
        this.useGoogleMaps = false; // !!this.googleMapsApiKey;
    }
    /**
     * Reverse geocoding - Convert coordinates to address
     */
    async reverseGeocode(request) {
        try {
            if (this.useGoogleMaps) {
                return await this.reverseGeocodeGoogle(request);
            }
            else {
                return await this.reverseGeocodeOpenCage(request);
            }
        }
        catch (error) {
            console.error('Geocoding error:', error);
            throw new Error('Failed to get address from coordinates');
        }
    }
    /**
     * Google Maps reverse geocoding
     */
    async reverseGeocodeGoogle(request) {
        const { latitude, longitude } = request;
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.googleMapsApiKey}`;
        const response = await axios_1.default.get(url);
        const data = response.data;
        console.log('Google Maps reverse geocoding response:', data);
        if (data.status !== 'OK' || !data.results || data.resuylts.length === 0) {
            throw new Error('No address found for coordinates');
        }
        const result = data.results[0];
        const addressComponents = result.address_components;
        // Extract address components
        let city = '';
        let state = '';
        let country = '';
        let pincode = '';
        addressComponents.forEach((component) => {
            const types = component.types;
            if (types.includes('locality') || types.includes('administrative_area_level_2')) {
                city = component.long_name;
            }
            else if (types.includes('administrative_area_level_1')) {
                state = component.long_name;
            }
            else if (types.includes('country')) {
                country = component.long_name;
            }
            else if (types.includes('postal_code')) {
                pincode = component.long_name;
            }
        });
        return {
            address: result.formatted_address,
            city: city || 'Unknown',
            state: state || 'Unknown',
            country: country || 'Unknown',
            pincode: pincode || undefined,
            coordinates: [longitude, latitude],
            formattedAddress: result.formatted_address,
        };
    }
    /**
     * OpenCage reverse geocoding (fallback)
     */
    async reverseGeocodeOpenCage(request) {
        const { latitude, longitude } = request;
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${this.openCageApiKey}&limit=1`;
        const response = await axios_1.default.get(url);
        const data = response.data;
        if (data.status.code !== 200 || !data.results || data.results.length === 0) {
            throw new Error('No address found for coordinates');
        }
        const result = data.results[0];
        const components = result.components;
        return {
            address: result.formatted,
            city: components.city || components.town || components.village || 'Unknown',
            state: components.state || 'Unknown',
            country: components.country || 'Unknown',
            pincode: components.postcode || undefined,
            coordinates: [longitude, latitude],
            formattedAddress: result.formatted,
        };
    }
    /**
     * Search addresses by query
     */
    async searchAddresses(request) {
        try {
            if (this.useGoogleMaps) {
                return await this.searchAddressesGoogle(request);
            }
            else {
                return await this.searchAddressesOpenCage(request);
            }
        }
        catch (error) {
            console.error('Address search error:', error);
            throw new Error('Failed to search addresses');
        }
    }
    /**
     * Google Places API address search
     */
    async searchAddressesGoogle(request) {
        const { query, limit = 5 } = request;
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=address&key=${this.googleMapsApiKey}`;
        const response = await axios_1.default.get(url);
        const data = response.data;
        if (data.status !== 'OK' || !data.predictions) {
            return [];
        }
        const results = [];
        for (const prediction of data.predictions.slice(0, limit)) {
            try {
                // Get place details for coordinates
                const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address&key=${this.googleMapsApiKey}`;
                const detailsResponse = await axios_1.default.get(detailsUrl);
                const detailsData = detailsResponse.data;
                if (detailsData.status === 'OK' && detailsData.result.geometry) {
                    const location = detailsData.result.geometry.location;
                    results.push({
                        address: prediction.description,
                        coordinates: [location.lng, location.lat],
                        formattedAddress: detailsData.result.formatted_address,
                        placeId: prediction.place_id,
                    });
                }
            }
            catch (error) {
                console.error('Error getting place details:', error);
            }
        }
        return results;
    }
    /**
     * OpenCage address search
     */
    async searchAddressesOpenCage(request) {
        const { query, limit = 5 } = request;
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${this.openCageApiKey}&limit=${limit}`;
        const response = await axios_1.default.get(url);
        const data = response.data;
        if (data.status.code !== 200 || !data.results) {
            return [];
        }
        return data.results.map((result) => ({
            address: result.formatted,
            coordinates: [result.geometry.lng, result.geometry.lat],
            formattedAddress: result.formatted,
        }));
    }
    /**
     * Get timezone for coordinates
     */
    async getTimezone(latitude, longitude) {
        try {
            if (this.useGoogleMaps) {
                return await this.getTimezoneGoogle(latitude, longitude);
            }
            else {
                // Fallback to a simple timezone estimation
                return this.estimateTimezone(longitude);
            }
        }
        catch (error) {
            console.error('Timezone error:', error);
            return this.estimateTimezone(longitude);
        }
    }
    /**
     * Google Maps timezone API
     */
    async getTimezoneGoogle(latitude, longitude) {
        const timestamp = Math.floor(Date.now() / 1000);
        const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${latitude},${longitude}&timestamp=${timestamp}&key=${this.googleMapsApiKey}`;
        const response = await axios_1.default.get(url);
        const data = response.data;
        if (data.status === 'OK') {
            return data.timeZoneId;
        }
        return this.estimateTimezone(longitude);
    }
    /**
     * Simple timezone estimation based on longitude
     */
    estimateTimezone(longitude) {
        // Simple timezone estimation for India
        if (longitude >= 68 && longitude <= 97) {
            return 'Asia/Kolkata';
        }
        // Default to UTC
        return 'UTC';
    }
    /**
     * Validate if coordinates are valid
     */
    validateCoordinates(latitude, longitude) {
        return (latitude >= -90 && latitude <= 90 &&
            longitude >= -180 && longitude <= 180 &&
            !isNaN(latitude) && !isNaN(longitude));
    }
    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
}
exports.geocodingService = new GeocodingService();
