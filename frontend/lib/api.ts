// API Client for Crowd Carry

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cc_token');
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  }

  // Auth
  async register(data: RegisterData) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ success: boolean; data: { token: string; user: User } }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
  }

  async getMe() {
    return this.request<{ success: boolean; data: User }>('/api/auth/me');
  }

  async forgotPassword(email: string) {
    return this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string) {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  // User
  async getProfile() {
    return this.request<{ success: boolean; data: User }>('/api/users/profile');
  }

  async updateProfile(data: Partial<User>) {
    return this.request('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getUserPublic(id: string) {
    return this.request<{ success: boolean; data: User }>(`/api/users/${id}/public`);
  }

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    const token = this.getToken();
    const response = await fetch(`${this.baseUrl}/api/users/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return response.json();
  }

  // Trips
  async createTrip(data: CreateTripData) {
    return this.request('/api/trips', { method: 'POST', body: JSON.stringify(data) });
  }

  async getTrips(params?: TripFilters) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<{ success: boolean; data: Trip[]; pagination: Pagination }>(
      `/api/trips${query}`
    );
  }

  async getTrip(id: string) {
    return this.request<{ success: boolean; data: Trip }>(`/api/trips/${id}`);
  }

  async updateTrip(id: string, data: Partial<CreateTripData>) {
    return this.request(`/api/trips/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteTrip(id: string) {
    return this.request(`/api/trips/${id}`, { method: 'DELETE' });
  }

  // Packages
  async createPackage(data: FormData) {
    const token = this.getToken();
    const response = await fetch(`${this.baseUrl}/api/packages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });
    return response.json();
  }

  async getPackages(params?: PackageFilters) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<{ success: boolean; data: Package[]; pagination: Pagination }>(
      `/api/packages${query}`
    );
  }

  async getPackage(id: string) {
    return this.request<{ success: boolean; data: Package }>(`/api/packages/${id}`);
  }

  async updatePackage(id: string, data: any) {
    return this.request(`/api/packages/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deliverPackage(id: string, pin: string) {
    return this.request(`/api/packages/${id}/deliver`, { method: 'POST', body: JSON.stringify({ pin }) });
  }

  async getPackagePricing(id: string) {
    return this.request(`/api/packages/${id}/pricing`);
  }

  // Payments / Escrow
  async fundEscrow(packageId: string) {
    return this.request('/api/payments/create-checkout', { 
      method: 'POST', 
      body: JSON.stringify({ packageId }) 
    });
  }

  // Matches
  async findMatches(packageId: string) {
    return this.request(`/api/matches/package/${packageId}`);
  }

  async getMatch(id: string) {
    return this.request(`/api/matches/${id}`);
  }

  async acceptMatch(id: string) {
    return this.request(`/api/matches/${id}/accept`, { method: 'POST' });
  }

  async rejectMatch(id: string) {
    return this.request(`/api/matches/${id}/reject`, { method: 'POST' });
  }

  async getMyMatches() {
    return this.request<{ success: boolean; data: Match[] }>('/api/matches/traveler/my-matches');
  }

  // Reviews
  async createReview(data: CreateReviewData) {
    return this.request('/api/reviews', { method: 'POST', body: JSON.stringify(data) });
  }

  async getUserReviews(userId: string, page = 1) {
    return this.request(`/api/reviews/user/${userId}?page=${page}`);
  }

  // Notifications
  async getNotifications(page = 1, unreadOnly = false) {
    return this.request<{ success: boolean; data: Notification[]; unreadCount: number }>(
      `/api/notifications?page=${page}&unreadOnly=${unreadOnly}`
    );
  }

  async markNotificationRead(id: string) {
    return this.request(`/api/notifications/${id}/read`, { method: 'PUT' });
  }

  async markAllNotificationsRead() {
    return this.request('/api/notifications/read-all', { method: 'PUT' });
  }

  // Sustainability
  async getSustainabilityStats() {
    return this.request<{ success: boolean; data: SustainabilityStats }>('/api/sustainability/stats');
  }

  // Admin
  async getAdminDashboard() {
    return this.request('/api/admin/dashboard');
  }

  async getAdminUsers(params?: any) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/api/admin/users${query}`);
  }

  async verifyAdminUser(userId: string) {
    return this.request(`/api/admin/users/${userId}/verify`, { method: 'PUT' });
  }

  async verifyUser(id: string) {
    return this.request(`/api/admin/users/${id}/verify`, { method: 'PUT' });
  }

  async getAdminReports(status = 'PENDING') {
    return this.request(`/api/admin/reports?status=${status}`);
  }

  async updateReport(id: string, data: any) {
    return this.request(`/api/admin/reports/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async getAdminPackages(params?: any) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/api/admin/packages${query}`);
  }

  // Chat
  async getChatHistory(matchId: string) {
    return this.request(`/api/chat/${matchId}`);
  }

  // KYC
  async submitKyc(documentUrl: string) {
    return this.request('/api/users/kyc', {
      method: 'POST',
      body: JSON.stringify({ documentUrl })
    });
  }

  async verifyEmail() {
    return this.request('/api/users/verify-email', { method: 'POST' });
  }

  async verifyPhone() {
    return this.request('/api/users/verify-phone', { method: 'POST' });
  }
}

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: 'USER' | 'TRAVELER' | 'ADMIN';
  isVerified: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  bio?: string;
  city?: string;
  country?: string;
  trustScore: number;
  rating: number;
  totalRatings: number;
  completedDeliveries: number;
  totalTrips: number;
  successRate: number;
  isTrustedTraveler: boolean;
  isVerifiedBadge: boolean;
  isTopCarrier: boolean;
  createdAt: string;
}

export interface Trip {
  id: string;
  userId: string;
  user: Partial<User>;
  sourceCity: string;
  destinationCity: string;
  travelDate: string;
  travelTime?: string;
  vehicleType: string;
  availableCapacity: number;
  availableWeight: number;
  pricePerKg?: number;
  notes?: string;
  isActive: boolean;
  isCompleted: boolean;
  routeDistance?: number;
  sourceLat?: number;
  sourceLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  createdAt: string;
}

export interface Package {
  id: string;
  userId: string;
  user: Partial<User>;
  title: string;
  description?: string;
  pickupAddress: string;
  pickupCity: string;
  pickupCountry?: string;
  destinationAddress: string;
  destinationCity: string;
  destinationCountry?: string;
  weight: number;
  size: string;
  category: string;
  urgency: string;
  rewardAmount: number;
  suggestedMin?: number;
  suggestedRecommended?: number;
  suggestedPremium?: number;
  status: string;
  imageUrls: string[];
  estimatedValue?: number;
  riskScore: number;
  riskLevel: string;
  pickupLat?: number;
  pickupLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  matches?: Match[];
  deliveryPin?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface Match {
  id: string;
  packageId: string;
  tripId: string;
  travelerId: string;
  senderId: string;
  matchScore: number;
  routeScore: number;
  dateScore: number;
  weightScore: number;
  ratingScore: number;
  successRateScore: number;
  matchQuality: string;
  explanation?: string;
  isAccepted: boolean;
  isRejected: boolean;
  trip?: Trip;
  package?: Package;
  traveler?: User;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export interface SustainabilityStats {
  totalCO2SavedKg: number;
  totalDeliveries: number;
  totalMoneySaved: number;
  totalDistanceOptimized: number;
  treesEquivalent: number;
  co2PerDelivery: number;
  totalUsers: number;
  totalTrips: number;
  platformStats: {
    co2SavedTons: number;
    deliveriesCompleted: number;
    moneySaved: number;
    citiesConnected: number;
    activeCarriers: number;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: string;
}

export interface CreateTripData {
  sourceCity: string;
  destinationCity: string;
  travelDate: string;
  travelTime?: string;
  vehicleType: string;
  availableCapacity: number;
  availableWeight: number;
  pricePerKg?: number;
  notes?: string;
  sourceLat?: number;
  sourceLng?: number;
  destinationLat?: number;
  destinationLng?: number;
}

export interface TripFilters {
  sourceCity?: string;
  destinationCity?: string;
  date?: string;
  vehicleType?: string;
  minWeight?: string;
  page?: string;
  limit?: string;
}

export interface PackageFilters {
  pickupCity?: string;
  destinationCity?: string;
  status?: string;
  category?: string;
  urgency?: string;
  page?: string;
  limit?: string;
  myPackages?: string;
}

export interface CreateReviewData {
  revieweeId: string;
  rating: number;
  comment?: string;
  packageId?: string;
}

export const api = new ApiClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
);

export default api;
