export interface UserProfile {
  id: string;
  name: string;
  age: number;
  pincode: string;
  location: {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    country: string;
  };
  preferences: {
    budget: {
      min: number;
      max: number;
    };
    travelType: string[];
    amenities: string[];
    starRating: number;
  };
  bookingHistory: {
    hotelId: string;
    destination: string;
    checkIn: string;
    checkOut: string;
    rating: number;
    amount: number;
  }[];
}

export class UserProfileService {
  private profiles: Map<string, UserProfile> = new Map();

  constructor() {
    this.initializeSampleProfiles();
  }

  private initializeSampleProfiles() {
    const sampleProfiles: UserProfile[] = [
      {
        id: "user_001",
        name: "John Smith",
        age: 35,
        pincode: "10001",
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          city: "New York",
          state: "New York",
          country: "USA"
        },
        preferences: {
          budget: { min: 200, max: 500 },
          travelType: ["family", "leisure"],
          amenities: ["pool", "kids_club", "beach_access"],
          starRating: 4
        },
        bookingHistory: [
          {
            hotelId: "hotel_001",
            destination: "Cancun, Mexico",
            checkIn: "2024-03-15",
            checkOut: "2024-03-22",
            rating: 5,
            amount: 2800
          }
        ]
      },
      {
        id: "user_002",
        name: "Sarah Johnson",
        age: 28,
        pincode: "90210",
        location: {
          latitude: 34.0522,
          longitude: -118.2437,
          city: "Los Angeles",
          state: "California",
          country: "USA"
        },
        preferences: {
          budget: { min: 150, max: 400 },
          travelType: ["business", "leisure"],
          amenities: ["spa", "gym", "wifi"],
          starRating: 3
        },
        bookingHistory: [
          {
            hotelId: "hotel_002",
            destination: "Miami, Florida",
            checkIn: "2024-02-10",
            checkOut: "2024-02-15",
            rating: 4,
            amount: 1200
          }
        ]
      }
    ];

    sampleProfiles.forEach(profile => {
      this.profiles.set(profile.id, profile);
    });
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.profiles.get(userId) || null;
  }

  async getUsersByLocation(pincode: string): Promise<UserProfile[]> {
    return Array.from(this.profiles.values()).filter(profile => 
      profile.pincode === pincode
    );
  }

  async getUsersByAge(minAge: number, maxAge: number): Promise<UserProfile[]> {
    return Array.from(this.profiles.values()).filter(profile => 
      profile.age >= minAge && profile.age <= maxAge
    );
  }

  async createUserProfile(profile: Omit<UserProfile, 'id'>): Promise<UserProfile> {
    const id = `user_${Date.now()}`;
    const newProfile: UserProfile = { ...profile, id };
    this.profiles.set(id, newProfile);
    return newProfile;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const profile = this.profiles.get(userId);
    if (!profile) return null;

    const updatedProfile = { ...profile, ...updates };
    this.profiles.set(userId, updatedProfile);
    return updatedProfile;
  }

  async getAllProfiles(): Promise<UserProfile[]> {
    return Array.from(this.profiles.values());
  }

  // Get distance between two coordinates using Haversine formula
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

  async getUsersNearLocation(latitude: number, longitude: number, radiusKm: number): Promise<UserProfile[]> {
    return Array.from(this.profiles.values()).filter(profile => {
      const distance = this.calculateDistance(
        latitude, longitude,
        profile.location.latitude, profile.location.longitude
      );
      return distance <= radiusKm;
    });
  }
}