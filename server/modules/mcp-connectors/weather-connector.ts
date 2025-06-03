import { BaseMCPConnector } from './base-connector';
import axios from 'axios';

export interface WeatherParams {
  location?: string;
  lat?: number;
  lon?: number;
  units?: 'metric' | 'imperial' | 'kelvin';
}

export interface WeatherResult {
  current?: {
    temperature: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    visibility: number;
    wind_speed: number;
    wind_direction: number;
    weather_code: number;
    weather_description: string;
    icon: string;
  };
  forecast?: Array<{
    date: string;
    temperature_min: number;
    temperature_max: number;
    weather_code: number;
    weather_description: string;
    precipitation_probability: number;
    wind_speed: number;
  }>;
  location: {
    name: string;
    country: string;
    lat: number;
    lon: number;
    timezone: string;
  };
}

export class WeatherConnector extends BaseMCPConnector {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor(config: any) {
    super({
      id: 'weather',
      name: 'Weather API',
      description: 'Real-time weather data and forecasts via OpenWeatherMap',
      category: 'environment',
      type: 'weather',
      ...config
    });
    
    this.apiKey = process.env.OPENWEATHERMAP_API_KEY || config.apiKey;
    if (!this.apiKey) {
      throw new Error('OPENWEATHERMAP_API_KEY is required for Weather connector');
    }
  }

  async getCurrentWeather(params: WeatherParams): Promise<WeatherResult> {
    try {
      let url = `${this.baseUrl}/weather?appid=${this.apiKey}&units=${params.units || 'metric'}`;
      
      if (params.lat && params.lon) {
        url += `&lat=${params.lat}&lon=${params.lon}`;
      } else if (params.location) {
        url += `&q=${encodeURIComponent(params.location)}`;
      } else {
        throw new Error('Either location or lat/lon coordinates are required');
      }

      const response = await axios.get(url);
      const data = response.data;

      return {
        current: {
          temperature: data.main.temp,
          feels_like: data.main.feels_like,
          humidity: data.main.humidity,
          pressure: data.main.pressure,
          visibility: data.visibility,
          wind_speed: data.wind?.speed || 0,
          wind_direction: data.wind?.deg || 0,
          weather_code: data.weather[0].id,
          weather_description: data.weather[0].description,
          icon: data.weather[0].icon
        },
        location: {
          name: data.name,
          country: data.sys.country,
          lat: data.coord.lat,
          lon: data.coord.lon,
          timezone: data.timezone.toString()
        }
      };
    } catch (error: any) {
      throw new Error(`Weather API request failed: ${error.message}`);
    }
  }

  async getForecast(params: WeatherParams, days: number = 5): Promise<WeatherResult> {
    try {
      let url = `${this.baseUrl}/forecast?appid=${this.apiKey}&units=${params.units || 'metric'}`;
      
      if (params.lat && params.lon) {
        url += `&lat=${params.lat}&lon=${params.lon}`;
      } else if (params.location) {
        url += `&q=${encodeURIComponent(params.location)}`;
      } else {
        throw new Error('Either location or lat/lon coordinates are required');
      }

      const response = await axios.get(url);
      const data = response.data;

      // Group forecast by day
      const dailyForecasts = new Map();
      data.list.forEach((item: any) => {
        const date = new Date(item.dt * 1000).toISOString().split('T')[0];
        if (!dailyForecasts.has(date)) {
          dailyForecasts.set(date, {
            date,
            temperature_min: item.main.temp_min,
            temperature_max: item.main.temp_max,
            weather_code: item.weather[0].id,
            weather_description: item.weather[0].description,
            precipitation_probability: item.pop * 100,
            wind_speed: item.wind?.speed || 0
          });
        } else {
          const existing = dailyForecasts.get(date);
          existing.temperature_min = Math.min(existing.temperature_min, item.main.temp_min);
          existing.temperature_max = Math.max(existing.temperature_max, item.main.temp_max);
        }
      });

      return {
        forecast: Array.from(dailyForecasts.values()).slice(0, days),
        location: {
          name: data.city.name,
          country: data.city.country,
          lat: data.city.coord.lat,
          lon: data.city.coord.lon,
          timezone: data.city.timezone.toString()
        }
      };
    } catch (error: any) {
      throw new Error(`Weather forecast request failed: ${error.message}`);
    }
  }

  async processMessage(message: any): Promise<any> {
    const { action, params } = message;

    switch (action) {
      case 'current_weather':
        return await this.getCurrentWeather(params);
      
      case 'forecast':
        return await this.getForecast(params, params.days || 5);
      
      case 'weather_alerts':
        // This would require a different API endpoint for alerts
        return { alerts: [], message: 'Weather alerts require premium API access' };

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  getEndpoints() {
    return [
      {
        path: '/current',
        method: 'POST' as const,
        description: 'Get current weather conditions',
        schema: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'City name or address' },
            lat: { type: 'number', description: 'Latitude' },
            lon: { type: 'number', description: 'Longitude' },
            units: { type: 'string', enum: ['metric', 'imperial', 'kelvin'], default: 'metric' }
          }
        }
      },
      {
        path: '/forecast',
        method: 'POST' as const,
        description: 'Get weather forecast',
        schema: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'City name or address' },
            lat: { type: 'number', description: 'Latitude' },
            lon: { type: 'number', description: 'Longitude' },
            units: { type: 'string', enum: ['metric', 'imperial', 'kelvin'], default: 'metric' },
            days: { type: 'number', default: 5, minimum: 1, maximum: 5 }
          }
        }
      }
    ];
  }

  getCapabilities() {
    return [
      'current_weather',
      'weather_forecast',
      'temperature_monitoring',
      'precipitation_data',
      'wind_data',
      'humidity_tracking'
    ];
  }
}