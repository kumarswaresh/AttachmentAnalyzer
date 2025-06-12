export interface Hotel {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  starRating: number;
  amenities: string[];
  roomTypes: {
    type: string;
    capacity: number;
    baseRate: number;
  }[];
  bookingData: {
    month: string;
    year: number;
    totalBookings: number;
    averageRate: number;
    occupancyRate: number;
    topClientTypes: string[];
  }[];
  familyFriendly: boolean;
  businessFriendly: boolean;
  eventCapability: boolean;
  seasonalTrends: {
    peak: string[];
    low: string[];
    shoulder: string[];
  };
  nearbyAttractions: string[];
  rating: number;
  reviewCount: number;
}

export interface HotelSearchFilters {
  destination?: string;
  starRating?: number;
  minRate?: number;
  maxRate?: number;
  amenities?: string[];
  familyFriendly?: boolean;
  businessFriendly?: boolean;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  checkIn?: string;
  checkOut?: string;
}

export class HotelService {
  private hotels: Map<string, Hotel> = new Map();

  constructor() {
    this.initializeSampleHotels();
  }

  private initializeSampleHotels() {
    const sampleHotels: Hotel[] = [
      {
        id: "hotel_001",
        name: "Grand Fiesta Americana Coral Beach Cancun",
        location: {
          latitude: 21.1619,
          longitude: -86.8515,
          address: "Blvd. Kukulcan Km 9.5, Zona Hotelera",
          city: "Cancun",
          state: "Quintana Roo",
          country: "Mexico",
          pincode: "77500"
        },
        starRating: 5,
        amenities: ["pool", "spa", "beach_access", "kids_club", "restaurants", "bars", "wifi", "gym"],
        roomTypes: [
          { type: "Ocean View Suite", capacity: 4, baseRate: 450 },
          { type: "Family Suite", capacity: 6, baseRate: 650 },
          { type: "Presidential Suite", capacity: 8, baseRate: 1200 }
        ],
        bookingData: [
          {
            month: "February",
            year: 2025,
            totalBookings: 1250,
            averageRate: 389,
            occupancyRate: 85,
            topClientTypes: ["family", "couples", "business"]
          },
          {
            month: "March",
            year: 2025,
            totalBookings: 1450,
            averageRate: 429,
            occupancyRate: 92,
            topClientTypes: ["family", "spring_break", "couples"]
          },
          {
            month: "April",
            year: 2025,
            totalBookings: 1380,
            averageRate: 419,
            occupancyRate: 88,
            topClientTypes: ["family", "couples", "business"]
          }
        ],
        familyFriendly: true,
        businessFriendly: true,
        eventCapability: true,
        seasonalTrends: {
          peak: ["December", "January", "March", "April"],
          low: ["September", "October"],
          shoulder: ["May", "June", "November"]
        },
        nearbyAttractions: ["Chichen Itza", "Xcaret Park", "Cozumel", "Tulum Ruins"],
        rating: 4.6,
        reviewCount: 3247
      },
      {
        id: "hotel_002",
        name: "Moon Palace Cancun",
        location: {
          latitude: 20.8853,
          longitude: -87.0344,
          address: "Carretera Cancun-Chetumal Km 340",
          city: "Cancun",
          state: "Quintana Roo",
          country: "Mexico",
          pincode: "77500"
        },
        starRating: 5,
        amenities: ["pool", "water_park", "beach_access", "kids_club", "golf", "spa", "restaurants", "bars", "wifi"],
        roomTypes: [
          { type: "Junior Suite Ocean View", capacity: 4, baseRate: 380 },
          { type: "Family Suite", capacity: 6, baseRate: 580 },
          { type: "Grand Suite", capacity: 8, baseRate: 950 }
        ],
        bookingData: [
          {
            month: "February",
            year: 2025,
            totalBookings: 1180,
            averageRate: 359,
            occupancyRate: 82,
            topClientTypes: ["family", "multi_generation"]
          },
          {
            month: "March",
            year: 2025,
            totalBookings: 1320,
            averageRate: 399,
            occupancyRate: 89,
            topClientTypes: ["family", "spring_break"]
          },
          {
            month: "April",
            year: 2025,
            totalBookings: 1280,
            averageRate: 389,
            occupancyRate: 87,
            topClientTypes: ["family", "couples"]
          }
        ],
        familyFriendly: true,
        businessFriendly: false,
        eventCapability: true,
        seasonalTrends: {
          peak: ["December", "January", "March", "April", "July"],
          low: ["September", "October"],
          shoulder: ["May", "June", "November"]
        },
        nearbyAttractions: ["Jungle Tour", "Xel-Ha", "Swimming with Dolphins"],
        rating: 4.4,
        reviewCount: 5621
      },
      {
        id: "hotel_003",
        name: "Hyatt Ziva Cancun",
        location: {
          latitude: 21.0809,
          longitude: -86.7709,
          address: "Blvd. Kukulcan, Punta Cancun, Zona Hotelera",
          city: "Cancun",
          state: "Quintana Roo",
          country: "Mexico",
          pincode: "77500"
        },
        starRating: 4,
        amenities: ["pool", "beach_access", "kids_club", "spa", "restaurants", "bars", "wifi", "water_sports"],
        roomTypes: [
          { type: "Ocean View King", capacity: 2, baseRate: 320 },
          { type: "Family Suite", capacity: 6, baseRate: 520 },
          { type: "Master Suite", capacity: 8, baseRate: 850 }
        ],
        bookingData: [
          {
            month: "February",
            year: 2025,
            totalBookings: 980,
            averageRate: 299,
            occupancyRate: 78,
            topClientTypes: ["family", "couples"]
          },
          {
            month: "March",
            year: 2025,
            totalBookings: 1150,
            averageRate: 339,
            occupancyRate: 86,
            topClientTypes: ["family", "spring_break"]
          },
          {
            month: "April",
            year: 2025,
            totalBookings: 1080,
            averageRate: 329,
            occupancyRate: 83,
            topClientTypes: ["family", "couples"]
          }
        ],
        familyFriendly: true,
        businessFriendly: true,
        eventCapability: false,
        seasonalTrends: {
          peak: ["March", "April", "December"],
          low: ["September", "October"],
          shoulder: ["May", "June", "November", "January", "February"]
        },
        nearbyAttractions: ["Interactive Aquarium", "La Isla Shopping Village"],
        rating: 4.3,
        reviewCount: 2847
      }
    ];

    sampleHotels.forEach(hotel => {
      this.hotels.set(hotel.id, hotel);
    });
  }

  async searchHotels(filters: HotelSearchFilters): Promise<Hotel[]> {
    let hotels = Array.from(this.hotels.values());

    if (filters.destination) {
      hotels = hotels.filter(hotel => 
        hotel.location.city.toLowerCase().includes(filters.destination!.toLowerCase()) ||
        hotel.location.country.toLowerCase().includes(filters.destination!.toLowerCase())
      );
    }

    if (filters.starRating) {
      hotels = hotels.filter(hotel => hotel.starRating >= filters.starRating!);
    }

    if (filters.familyFriendly !== undefined) {
      hotels = hotels.filter(hotel => hotel.familyFriendly === filters.familyFriendly);
    }

    if (filters.businessFriendly !== undefined) {
      hotels = hotels.filter(hotel => hotel.businessFriendly === filters.businessFriendly);
    }

    if (filters.amenities && filters.amenities.length > 0) {
      hotels = hotels.filter(hotel => 
        filters.amenities!.some(amenity => hotel.amenities.includes(amenity))
      );
    }

    if (filters.latitude && filters.longitude && filters.radiusKm) {
      hotels = hotels.filter(hotel => {
        const distance = this.calculateDistance(
          filters.latitude!, filters.longitude!,
          hotel.location.latitude, hotel.location.longitude
        );
        return distance <= filters.radiusKm!;
      });
    }

    return hotels;
  }

  async getHotelById(id: string): Promise<Hotel | null> {
    return this.hotels.get(id) || null;
  }

  async getTopBookedHotels(destination: string, months: string[], limit: number = 12): Promise<Hotel[]> {
    const hotels = await this.searchHotels({ destination });
    
    // Calculate total bookings for specified months
    const hotelBookings = hotels.map(hotel => {
      const totalBookings = hotel.bookingData
        .filter(data => months.includes(data.month))
        .reduce((sum, data) => sum + data.totalBookings, 0);
      
      return { hotel, totalBookings };
    });

    // Sort by total bookings and return top hotels
    return hotelBookings
      .sort((a, b) => b.totalBookings - a.totalBookings)
      .slice(0, limit)
      .map(item => item.hotel);
  }

  async getHotelsByEvent(eventType: string, destination: string): Promise<Hotel[]> {
    const hotels = await this.searchHotels({ destination });
    
    // Filter based on event capability and suitability
    return hotels.filter(hotel => {
      switch (eventType.toLowerCase()) {
        case 'family':
          return hotel.familyFriendly;
        case 'business':
          return hotel.businessFriendly;
        case 'conference':
          return hotel.eventCapability;
        case 'wedding':
          return hotel.eventCapability && hotel.starRating >= 4;
        default:
          return true;
      }
    });
  }

  async getTrendingHotels(destination: string): Promise<Hotel[]> {
    const hotels = await this.searchHotels({ destination });
    
    // Sort by recent booking trends and rating
    return hotels.sort((a, b) => {
      const aRecent = a.bookingData[a.bookingData.length - 1]?.occupancyRate || 0;
      const bRecent = b.bookingData[b.bookingData.length - 1]?.occupancyRate || 0;
      
      if (aRecent !== bRecent) return bRecent - aRecent;
      return b.rating - a.rating;
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async addHotel(hotel: Omit<Hotel, 'id'>): Promise<Hotel> {
    const id = `hotel_${Date.now()}`;
    const newHotel: Hotel = { ...hotel, id };
    this.hotels.set(id, newHotel);
    return newHotel;
  }

  async updateHotel(id: string, updates: Partial<Hotel>): Promise<Hotel | null> {
    const hotel = this.hotels.get(id);
    if (!hotel) return null;

    const updatedHotel = { ...hotel, ...updates };
    this.hotels.set(id, updatedHotel);
    return updatedHotel;
  }

  async getAllHotels(): Promise<Hotel[]> {
    return Array.from(this.hotels.values());
  }
}