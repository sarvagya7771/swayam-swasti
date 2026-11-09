/**
 * Domain types shared by the app and the Supabase schema
 * (`supabase/schema.sql`). Every value here comes from a real database row.
 */

export type Role = 'customer' | 'admin';
export type TestimonialStatus = 'pending' | 'approved' | 'rejected';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
export type NotificationType = 'booking' | 'testimonial' | 'system';

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: Role;
  createdAt: string;
}

export interface Booking {
  id: string;
  serviceName: string;
  scheduledAt: string;
  status: BookingStatus;
  notes?: string;
  reference?: string;
  /** Only populated for administrators listing every booking. */
  customerName?: string;
  customerEmail?: string;
}

export interface Testimonial {
  id: string;
  userId: string;
  authorName: string;
  rating: number;
  content: string;
  status: TestimonialStatus;
  adminNote?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}

/** Administrator view of a notification, including its recipient. */
export interface AdminNotification extends AppNotification {
  userId: string;
  recipientName: string;
  recipientEmail: string;
}

export interface Service {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  duration: string;
  priceLabel: string;
  highlights: string[];
}

export interface GuidanceArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  readMinutes: number;
}

export interface AdminCustomer {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: Role;
  createdAt: string;
  bookingCount: number;
  testimonialCount: number;
}
