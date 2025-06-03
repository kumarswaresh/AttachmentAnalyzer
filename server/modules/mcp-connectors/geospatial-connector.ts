import { BaseMCPConnector } from './base-connector';
import axios from 'axios';

export interface GeospatialParams {
  lat?: number;
  lon?: number;
  address?: string;
  radius?: number;
  limit?: number;
}

export interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
  address: {
    road?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  boundingbox: number[];
}

export interface ReverseGeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

export interface PlacesResult {
  places: Array<{
    name: string;
    type: string;
    lat: number;
    lon: number;
    distance?: number;
    address: string;
  }>;
}

export class GeospatialConnector extends BaseMCPConnector {
  private nominatimUrl = 'https://nominatim.openstreetmap.org';
  private overpassUrl = 'https://overpass-api.de/api/interpreter';

  constructor(config: any) {
    super({
      id: 'geospatial',
      name: 'Geospatial Services',
      description: 'Location services including geocoding, reverse geocoding, and places search',
      category: 'location',
      type: 'geospatial',
      ...config
    });
  }

  async geocode(address: string): Promise<GeocodingResult[]> {
    try {
      const response = await axios.get(`${this.nominatimUrl}/search`, {
        params: {
          q: address,
          format: 'json',
          addressdetails: 1,
          limit: 5
        },
        headers: {
          'User-Agent': 'AgentPlatform/1.0'
        }
      });

      return response.data.map((item: any) => ({
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        display_name: item.display_name,
        address: {
          road: item.address?.road,
          city: item.address?.city || item.address?.town || item.address?.village,
          state: item.address?.state,
          country: item.address?.country,
          postcode: item.address?.postcode
        },
        boundingbox: item.boundingbox.map((coord: string) => parseFloat(coord))
      }));
    } catch (error: any) {
      throw new Error(`Geocoding failed: ${error.message}`);
    }
  }

  async reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodingResult> {
    try {
      const response = await axios.get(`${this.nominatimUrl}/reverse`, {
        params: {
          lat: lat,
          lon: lon,
          format: 'json',
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'AgentPlatform/1.0'
        }
      });

      const data = response.data;
      return {
        lat: parseFloat(data.lat),
        lon: parseFloat(data.lon),
        display_name: data.display_name,
        address: {
          house_number: data.address?.house_number,
          road: data.address?.road,
          neighbourhood: data.address?.neighbourhood,
          city: data.address?.city || data.address?.town || data.address?.village,
          state: data.address?.state,
          country: data.address?.country,
          postcode: data.address?.postcode
        }
      };
    } catch (error: any) {
      throw new Error(`Reverse geocoding failed: ${error.message}`);
    }
  }

  async findNearbyPlaces(lat: number, lon: number, type: string = 'amenity', radius: number = 1000): Promise<PlacesResult> {
    try {
      const query = `
        [out:json][timeout:25];
        (
          node["${type}~"."](around:${radius},${lat},${lon});
          way["${type}~"."](around:${radius},${lat},${lon});
          relation["${type}~"."](around:${radius},${lat},${lon});
        );
        out center meta;
      `;

      const response = await axios.post(this.overpassUrl, query, {
        headers: {
          'Content-Type': 'text/plain'
        }
      });

      const places = response.data.elements.map((element: any) => {
        const elementLat = element.lat || element.center?.lat;
        const elementLon = element.lon || element.center?.lon;
        const distance = this.calculateDistance(lat, lon, elementLat, elementLon);

        return {
          name: element.tags?.name || 'Unnamed',
          type: element.tags?.[type] || type,
          lat: elementLat,
          lon: elementLon,
          distance: Math.round(distance),
          address: this.formatAddress(element.tags)
        };
      }).filter((place: any) => place.lat && place.lon);

      return { places: places.slice(0, 20) }; // Limit to 20 results
    } catch (error: any) {
      throw new Error(`Places search failed: ${error.message}`);
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Convert to meters
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private formatAddress(tags: any): string {
    const parts = [];
    if (tags?.['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags?.['addr:street']) parts.push(tags['addr:street']);
    if (tags?.['addr:city']) parts.push(tags['addr:city']);
    return parts.join(', ') || 'Address not available';
  }

  async processMessage(message: any): Promise<any> {
    const { action, params } = message;

    switch (action) {
      case 'geocode':
        if (!params.address) throw new Error('Address parameter is required');
        return await this.geocode(params.address);
      
      case 'reverse_geocode':
        if (!params.lat || !params.lon) throw new Error('Latitude and longitude are required');
        return await this.reverseGeocode(params.lat, params.lon);
      
      case 'find_nearby':
        if (!params.lat || !params.lon) throw new Error('Latitude and longitude are required');
        return await this.findNearbyPlaces(
          params.lat, 
          params.lon, 
          params.type || 'amenity', 
          params.radius || 1000
        );

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  getEndpoints() {
    return [
      {
        path: '/geocode',
        method: 'POST' as const,
        description: 'Convert address to coordinates',
        schema: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'Address to geocode' }
          },
          required: ['address']
        }
      },
      {
        path: '/reverse-geocode',
        method: 'POST' as const,
        description: 'Convert coordinates to address',
        schema: {
          type: 'object',
          properties: {
            lat: { type: 'number', description: 'Latitude' },
            lon: { type: 'number', description: 'Longitude' }
          },
          required: ['lat', 'lon']
        }
      },
      {
        path: '/nearby',
        method: 'POST' as const,
        description: 'Find nearby places',
        schema: {
          type: 'object',
          properties: {
            lat: { type: 'number', description: 'Latitude' },
            lon: { type: 'number', description: 'Longitude' },
            type: { type: 'string', default: 'amenity', description: 'Type of places to find' },
            radius: { type: 'number', default: 1000, description: 'Search radius in meters' }
          },
          required: ['lat', 'lon']
        }
      }
    ];
  }

  getCapabilities() {
    return [
      'geocoding',
      'reverse_geocoding',
      'places_search',
      'distance_calculation',
      'location_services'
    ];
  }
}