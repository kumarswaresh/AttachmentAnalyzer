import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { storage } from '../storage';

export interface HotelBookingData {
  id: string;
  hotelId: string;
  hotelName: string;
  location: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  roomType: string;
  totalAmount: number;
  currency: string;
  bookingStatus: 'confirmed' | 'cancelled' | 'pending';
  bookedAt: string;
  specialRequests?: string[];
  eventType?: 'festival' | 'conference' | 'wedding' | 'business' | 'leisure';
}

export interface HotelAnalytics {
  mostBookedHotels: Array<{
    hotelId: string;
    hotelName: string;
    location: string;
    bookingCount: number;
    averageRating: number;
    averagePrice: number;
  }>;
  seasonalTrends: Array<{
    period: string;
    bookingVolume: number;
    averagePrice: number;
    popularDestinations: string[];
  }>;
  eventBasedBookings: Array<{
    eventType: string;
    bookingCount: number;
    peakDates: string[];
    averageDuration: number;
    priceInflation: number;
  }>;
  festivalData: Array<{
    festivalName: string;
    location: string;
    dates: string[];
    nearbyHotels: Array<{
      hotelId: string;
      hotelName: string;
      distance: number;
      bookingIncrease: number;
    }>;
  }>;
}

export interface MCPHotelMessage {
  id: string;
  type: 'request' | 'response' | 'notification';
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class HotelMCPServer extends EventEmitter {
  private connections: Map<string, WebSocket> = new Map();
  private bookingData: HotelBookingData[] = [];
  private analytics: HotelAnalytics | null = null;

  constructor() {
    super();
    // Initialize data without external connections to prevent startup errors
    this.initializeHotelDataSafely();
    this.setupAnalytics();
  }

  private async initializeHotelDataSafely(): Promise<void> {
    // Safe initialization without external WebSocket connections
    try {
      // Generate sample hotel booking data without querying agents to avoid startup errors
      this.bookingData = this.generateHotelBookings(100);
      this.analytics = this.calculateAnalytics();
      
      this.emit('dataInitialized', {
        bookingCount: this.bookingData.length,
        agentCount: 0
      });
    } catch (error) {
      console.error('Hotel data initialization failed (safe mode):', error);
      // Continue with empty data to prevent startup failures
      this.bookingData = [];
      this.analytics = null;
    }
  }

  private async initializeHotelData(): Promise<void> {
    // In a real implementation, this would connect to your hotel booking database
    // For now, we'll simulate fetching from the agent platform's data
    try {
      const agents = await storage.getAgents();
      const hotelAgents = agents.filter(agent => 
        agent.role === 'hotel_booking' || 
        agent.goal.toLowerCase().includes('hotel') ||
        agent.goal.toLowerCase().includes('booking')
      );

      // Simulate hotel booking data based on agent interactions
      this.bookingData = this.generateHotelBookings(hotelAgents.length * 50);
      this.analytics = this.calculateAnalytics();
      
      this.emit('dataInitialized', {
        bookingCount: this.bookingData.length,
        agentCount: hotelAgents.length
      });
    } catch (error) {
      console.error('Failed to initialize hotel data:', error);
    }
  }

  private generateHotelBookings(count: number): HotelBookingData[] {
    const hotels = [
      { id: 'h1', name: 'Grand Palace Hotel', location: 'New York, NY' },
      { id: 'h2', name: 'Seaside Resort', location: 'Miami, FL' },
      { id: 'h3', name: 'Mountain View Lodge', location: 'Aspen, CO' },
      { id: 'h4', name: 'Urban Boutique Hotel', location: 'San Francisco, CA' },
      { id: 'h5', name: 'Historic Inn', location: 'Boston, MA' },
      { id: 'h6', name: 'Luxury Suites', location: 'Las Vegas, NV' },
      { id: 'h7', name: 'Beachfront Paradise', location: 'Honolulu, HI' },
      { id: 'h8', name: 'City Center Hotel', location: 'Chicago, IL' },
    ];

    const roomTypes = ['Standard', 'Deluxe', 'Suite', 'Premium', 'Executive'];
    const eventTypes: HotelBookingData['eventType'][] = ['festival', 'conference', 'wedding', 'business', 'leisure'];
    const statuses: HotelBookingData['bookingStatus'][] = ['confirmed', 'cancelled', 'pending'];

    const bookings: HotelBookingData[] = [];

    for (let i = 0; i < count; i++) {
      const hotel = hotels[Math.floor(Math.random() * hotels.length)];
      const checkInDate = this.getRandomDate(new Date(2024, 0, 1), new Date(2024, 11, 31));
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + Math.floor(Math.random() * 7) + 1);

      const booking: HotelBookingData = {
        id: `booking_${i + 1}`,
        hotelId: hotel.id,
        hotelName: hotel.name,
        location: hotel.location,
        checkInDate: checkInDate.toISOString().split('T')[0],
        checkOutDate: checkOutDate.toISOString().split('T')[0],
        guestCount: Math.floor(Math.random() * 6) + 1,
        roomType: roomTypes[Math.floor(Math.random() * roomTypes.length)],
        totalAmount: Math.floor(Math.random() * 1000) + 100,
        currency: 'USD',
        bookingStatus: statuses[Math.floor(Math.random() * statuses.length)],
        bookedAt: this.getRandomDate(new Date(2023, 0, 1), new Date()).toISOString(),
        eventType: Math.random() > 0.3 ? eventTypes[Math.floor(Math.random() * eventTypes.length)] : undefined,
        specialRequests: Math.random() > 0.7 ? ['Late check-in', 'High floor', 'Ocean view'] : undefined
      };

      bookings.push(booking);
    }

    return bookings;
  }

  private getRandomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  private calculateAnalytics(): HotelAnalytics {
    const confirmedBookings = this.bookingData.filter(b => b.bookingStatus === 'confirmed');
    
    // Most booked hotels
    const hotelBookingCount: Record<string, { count: number; totalAmount: number; hotel: HotelBookingData }> = {};
    confirmedBookings.forEach(booking => {
      if (!hotelBookingCount[booking.hotelId]) {
        hotelBookingCount[booking.hotelId] = { count: 0, totalAmount: 0, hotel: booking };
      }
      hotelBookingCount[booking.hotelId].count++;
      hotelBookingCount[booking.hotelId].totalAmount += booking.totalAmount;
    });

    const mostBookedHotels = Object.values(hotelBookingCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(item => ({
        hotelId: item.hotel.hotelId,
        hotelName: item.hotel.hotelName,
        location: item.hotel.location,
        bookingCount: item.count,
        averageRating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0-5.0 rating
        averagePrice: Math.round(item.totalAmount / item.count)
      }));

    // Seasonal trends
    const monthlyBookings: Record<string, { count: number; totalAmount: number; destinations: Set<string> }> = {};
    confirmedBookings.forEach(booking => {
      const month = booking.checkInDate.substring(0, 7); // YYYY-MM
      if (!monthlyBookings[month]) {
        monthlyBookings[month] = { count: 0, totalAmount: 0, destinations: new Set() };
      }
      monthlyBookings[month].count++;
      monthlyBookings[month].totalAmount += booking.totalAmount;
      monthlyBookings[month].destinations.add(booking.location);
    });

    const seasonalTrends = Object.entries(monthlyBookings)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({
        period,
        bookingVolume: data.count,
        averagePrice: Math.round(data.totalAmount / data.count),
        popularDestinations: Array.from(data.destinations).slice(0, 5)
      }));

    // Event-based bookings
    const eventBookings: Record<string, { count: number; dates: Set<string>; durations: number[]; amounts: number[] }> = {};
    confirmedBookings.filter(b => b.eventType).forEach(booking => {
      const eventType = booking.eventType!;
      if (!eventBookings[eventType]) {
        eventBookings[eventType] = { count: 0, dates: new Set(), durations: [], amounts: [] };
      }
      eventBookings[eventType].count++;
      eventBookings[eventType].dates.add(booking.checkInDate);
      
      const duration = (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24);
      eventBookings[eventType].durations.push(duration);
      eventBookings[eventType].amounts.push(booking.totalAmount);
    });

    const eventBasedBookings = Object.entries(eventBookings).map(([eventType, data]) => ({
      eventType,
      bookingCount: data.count,
      peakDates: Array.from(data.dates).sort().slice(-5),
      averageDuration: Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length * 10) / 10,
      priceInflation: Math.round((data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length / 250 - 1) * 100) // vs baseline of $250
    }));

    // Festival data (simulated)
    const festivalData = [
      {
        festivalName: 'Art Basel Miami',
        location: 'Miami, FL',
        dates: ['2024-12-06', '2024-12-07', '2024-12-08'],
        nearbyHotels: mostBookedHotels.filter(h => h.location.includes('Miami')).map(h => ({
          hotelId: h.hotelId,
          hotelName: h.hotelName,
          distance: Math.round(Math.random() * 10 + 1), // 1-10 miles
          bookingIncrease: Math.round(Math.random() * 200 + 50) // 50-250% increase
        }))
      },
      {
        festivalName: 'SXSW',
        location: 'Austin, TX',
        dates: ['2024-03-08', '2024-03-09', '2024-03-10', '2024-03-11', '2024-03-12'],
        nearbyHotels: [
          { hotelId: 'h9', hotelName: 'Austin Convention Hotel', distance: 2, bookingIncrease: 180 },
          { hotelId: 'h10', hotelName: 'Downtown Austin Lodge', distance: 1, bookingIncrease: 220 }
        ]
      }
    ];

    return {
      mostBookedHotels,
      seasonalTrends,
      eventBasedBookings,
      festivalData
    };
  }

  private setupAnalytics(): void {
    // Refresh analytics every hour
    setInterval(() => {
      this.analytics = this.calculateAnalytics();
      this.broadcastNotification('analytics/updated', this.analytics);
    }, 60 * 60 * 1000);
  }

  public async handleConnection(ws: WebSocket, connectionId: string): Promise<void> {
    this.connections.set(connectionId, ws);

    ws.on('message', async (data) => {
      try {
        const message: MCPHotelMessage = JSON.parse(data.toString());
        await this.handleMessage(connectionId, message);
      } catch (error) {
        const errorResponse: MCPHotelMessage = {
          id: 'unknown',
          type: 'response',
          error: {
            code: -32700,
            message: 'Parse error',
            data: error instanceof Error ? error.message : 'Unknown error'
          }
        };
        ws.send(JSON.stringify(errorResponse));
      }
    });

    ws.on('close', () => {
      this.connections.delete(connectionId);
    });

    // Send initialization
    const initMessage: MCPHotelMessage = {
      id: `hotel-init-${Date.now()}`,
      type: 'notification',
      method: 'hotel/initialized',
      params: {
        serverInfo: {
          name: 'Hotel Booking MCP Server',
          version: '1.0.0',
          dataCount: this.bookingData.length
        }
      }
    };

    ws.send(JSON.stringify(initMessage));
  }

  private async handleMessage(connectionId: string, message: MCPHotelMessage): Promise<void> {
    const ws = this.connections.get(connectionId);
    if (!ws) return;

    try {
      let response: MCPHotelMessage | null = null;

      switch (message.method) {
        case 'hotel/bookings/list':
          response = await this.handleListBookings(message);
          break;
        case 'hotel/bookings/search':
          response = await this.handleSearchBookings(message);
          break;
        case 'hotel/analytics/most-booked':
          response = await this.handleMostBookedHotels(message);
          break;
        case 'hotel/analytics/seasonal':
          response = await this.handleSeasonalTrends(message);
          break;
        case 'hotel/analytics/events':
          response = await this.handleEventAnalytics(message);
          break;
        case 'hotel/festivals/list':
          response = await this.handleFestivalData(message);
          break;
        case 'hotel/bookings/by-period':
          response = await this.handleBookingsByPeriod(message);
          break;
        case 'hotel/revenue/analysis':
          response = await this.handleRevenueAnalysis(message);
          break;
        default:
          response = {
            id: message.id,
            type: 'response',
            error: {
              code: -32601,
              message: 'Method not found',
              data: `Unknown method: ${message.method}`
            }
          };
      }

      if (response) {
        ws.send(JSON.stringify(response));
      }
    } catch (error) {
      const errorResponse: MCPHotelMessage = {
        id: message.id,
        type: 'response',
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error'
        }
      };
      ws.send(JSON.stringify(errorResponse));
    }
  }

  private async handleListBookings(message: MCPHotelMessage): Promise<MCPHotelMessage> {
    const { limit = 50, offset = 0, status } = message.params || {};
    
    let filteredBookings = this.bookingData;
    if (status) {
      filteredBookings = filteredBookings.filter(b => b.bookingStatus === status);
    }

    const paginatedBookings = filteredBookings.slice(offset, offset + limit);

    return {
      id: message.id,
      type: 'response',
      result: {
        bookings: paginatedBookings,
        total: filteredBookings.length,
        hasMore: offset + limit < filteredBookings.length
      }
    };
  }

  private async handleSearchBookings(message: MCPHotelMessage): Promise<MCPHotelMessage> {
    const { query, dateRange, location, eventType } = message.params || {};
    
    let results = this.bookingData;

    if (query) {
      const searchTerm = query.toLowerCase();
      results = results.filter(b => 
        b.hotelName.toLowerCase().includes(searchTerm) ||
        b.location.toLowerCase().includes(searchTerm) ||
        b.roomType.toLowerCase().includes(searchTerm)
      );
    }

    if (dateRange) {
      results = results.filter(b => 
        b.checkInDate >= dateRange.start && b.checkInDate <= dateRange.end
      );
    }

    if (location) {
      results = results.filter(b => 
        b.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    if (eventType) {
      results = results.filter(b => b.eventType === eventType);
    }

    return {
      id: message.id,
      type: 'response',
      result: {
        bookings: results.slice(0, 100), // Limit to 100 results
        total: results.length
      }
    };
  }

  private async handleMostBookedHotels(message: MCPHotelMessage): Promise<MCPHotelMessage> {
    return {
      id: message.id,
      type: 'response',
      result: {
        mostBookedHotels: this.analytics?.mostBookedHotels || []
      }
    };
  }

  private async handleSeasonalTrends(message: MCPHotelMessage): Promise<MCPHotelMessage> {
    return {
      id: message.id,
      type: 'response',
      result: {
        seasonalTrends: this.analytics?.seasonalTrends || []
      }
    };
  }

  private async handleEventAnalytics(message: MCPHotelMessage): Promise<MCPHotelMessage> {
    return {
      id: message.id,
      type: 'response',
      result: {
        eventBasedBookings: this.analytics?.eventBasedBookings || []
      }
    };
  }

  private async handleFestivalData(message: MCPHotelMessage): Promise<MCPHotelMessage> {
    return {
      id: message.id,
      type: 'response',
      result: {
        festivals: this.analytics?.festivalData || []
      }
    };
  }

  private async handleBookingsByPeriod(message: MCPHotelMessage): Promise<MCPHotelMessage> {
    const { period = 'month' } = message.params || {};
    
    const bookingsByPeriod: Record<string, { count: number; revenue: number; avgPrice: number }> = {};
    
    this.bookingData.filter(b => b.bookingStatus === 'confirmed').forEach(booking => {
      let periodKey: string;
      const date = new Date(booking.checkInDate);
      
      switch (period) {
        case 'day':
          periodKey = booking.checkInDate;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          periodKey = booking.checkInDate.substring(0, 7);
          break;
        case 'quarter':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          periodKey = `${date.getFullYear()}-Q${quarter}`;
          break;
        case 'year':
          periodKey = date.getFullYear().toString();
          break;
        default:
          periodKey = booking.checkInDate.substring(0, 7);
      }

      if (!bookingsByPeriod[periodKey]) {
        bookingsByPeriod[periodKey] = { count: 0, revenue: 0, avgPrice: 0 };
      }
      bookingsByPeriod[periodKey].count++;
      bookingsByPeriod[periodKey].revenue += booking.totalAmount;
    });

    // Calculate average prices
    Object.keys(bookingsByPeriod).forEach(key => {
      const data = bookingsByPeriod[key];
      data.avgPrice = Math.round(data.revenue / data.count);
    });

    return {
      id: message.id,
      type: 'response',
      result: {
        period,
        data: Object.entries(bookingsByPeriod)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([period, stats]) => ({ period, ...stats }))
      }
    };
  }

  private async handleRevenueAnalysis(message: MCPHotelMessage): Promise<MCPHotelMessage> {
    const confirmedBookings = this.bookingData.filter(b => b.bookingStatus === 'confirmed');
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const averageBookingValue = totalRevenue / confirmedBookings.length;
    
    const revenueByHotel = confirmedBookings.reduce((acc, booking) => {
      if (!acc[booking.hotelId]) {
        acc[booking.hotelId] = { 
          hotelName: booking.hotelName, 
          location: booking.location, 
          revenue: 0, 
          bookings: 0 
        };
      }
      acc[booking.hotelId].revenue += booking.totalAmount;
      acc[booking.hotelId].bookings++;
      return acc;
    }, {} as Record<string, { hotelName: string; location: string; revenue: number; bookings: number }>);

    const topRevenueHotels = Object.entries(revenueByHotel)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(([hotelId, data]) => ({
        hotelId,
        ...data,
        averageBookingValue: Math.round(data.revenue / data.bookings)
      }));

    return {
      id: message.id,
      type: 'response',
      result: {
        totalRevenue,
        totalBookings: confirmedBookings.length,
        averageBookingValue: Math.round(averageBookingValue),
        topRevenueHotels,
        revenueGrowth: this.calculateRevenueGrowth()
      }
    };
  }

  private calculateRevenueGrowth(): Array<{ month: string; revenue: number; growth: number }> {
    const monthlyRevenue: Record<string, number> = {};
    
    this.bookingData
      .filter(b => b.bookingStatus === 'confirmed')
      .forEach(booking => {
        const month = booking.checkInDate.substring(0, 7);
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + booking.totalAmount;
      });

    const sortedMonths = Object.keys(monthlyRevenue).sort();
    const growth = sortedMonths.map((month, index) => {
      const prevMonth = index > 0 ? monthlyRevenue[sortedMonths[index - 1]] : monthlyRevenue[month];
      const growthRate = index > 0 ? ((monthlyRevenue[month] - prevMonth) / prevMonth) * 100 : 0;
      
      return {
        month,
        revenue: monthlyRevenue[month],
        growth: Math.round(growthRate * 10) / 10
      };
    });

    return growth;
  }

  private broadcastNotification(method: string, params: any): void {
    const message: MCPHotelMessage = {
      id: `notification-${Date.now()}`,
      type: 'notification',
      method,
      params
    };

    const messageStr = JSON.stringify(message);
    this.connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  public getBookingStats(): { total: number; confirmed: number; pending: number; cancelled: number } {
    const stats = { total: 0, confirmed: 0, pending: 0, cancelled: 0 };
    
    this.bookingData.forEach(booking => {
      stats.total++;
      stats[booking.bookingStatus]++;
    });

    return stats;
  }
}

export const hotelMCPServer = new HotelMCPServer();