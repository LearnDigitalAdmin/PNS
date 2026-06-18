export type StoryStatus = 'draft' | 'scheduled' | 'live';

export interface AdminStory {
  id: number;
  title: string;
  category: string;
  excerpt: string;
  body: string;
  image: string;
  status: StoryStatus;
  author: string;
  date: string;
}

export interface Contestant {
  id: number;
  name: string;
  tagline: string;
  image: string;
  reward: string;
  votes: number;
  winner?: boolean;
}

export type CategoryStatus = 'open' | 'scheduled' | 'closed';

export interface VotingCategory {
  id: number;
  key: string;
  name: string;
  icon: string;
  status: CategoryStatus;
  opens: string;
  closes: string;
  contestants: Contestant[];
}

export type RequestStatus = 'pending' | 'approved' | 'contacted' | 'rejected';

export interface FeaturedRequest {
  id: number;
  name: string;
  email: string;
  category: string;
  instagram: string;
  detail: string;
  status: RequestStatus;
  date: string;
}
export interface BookingRequest {
  id: number;
  name: string;
  email: string;
  phone: string;
  service: string;
  prefDate: string;
  message: string;
  status: RequestStatus;
  date: string;
}
export interface SponsoredRequest {
  id: number;
  business: string;
  contact: string;
  email: string;
  industry: string;
  budget: string;
  goals: string;
  status: RequestStatus;
  date: string;
}
export interface PartnershipRequest {
  id: number;
  business: string;
  email: string;
  category: string;
  about: string;
  status: RequestStatus;
  date: string;
}
export interface MediaKitRequest {
  id: number;
  email: string;
  company: string;
  status: RequestStatus;
  date: string;
}

export interface RequestsState {
  featured: FeaturedRequest[];
  booking: BookingRequest[];
  sponsored: SponsoredRequest[];
  partnership: PartnershipRequest[];
  mediaKit: MediaKitRequest[];
}

export type RequestType = keyof RequestsState;

export type DealStage = 'inquiry' | 'production' | 'live' | 'completed';

export interface SponsoredDeal {
  id: number;
  business: string;
  industry: string;
  budget: string;
  contact: string;
  stage: DealStage;
}

export type PartnerStatus = 'active' | 'pending' | 'suspended';

export interface Partner {
  id: number;
  name: string;
  category: string;
  status: PartnerStatus;
  email: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  image: string;
}

export interface GalleryImage {
  id: number;
  image: string;
  caption: string;
  credit: string;
}

export interface ActivityLogEntry {
  text: string;
  time: string;
  type: 'admin' | 'system' | 'security';
}

export interface LoginAttempt {
  email: string;
  status: 'success' | 'blocked';
  location: string;
  device: string;
  time: string;
}

export interface Guard {
  label: string;
  desc: string;
}
