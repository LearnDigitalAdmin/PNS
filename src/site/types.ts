// export interface HeroSlide {
//   id: string;
//   image: string;
//   badge: string;
//   badgeType?: 'category' | 'sponsored';
//   titleLine1: string;
//   titleLine2?: string;
//   subtitle: string;
//   excerpt: string;
//   ctas: { label: string; action: HeroAction }[];
// }

// export type HeroAction =
//   | { type: 'goToPage'; page: number }
//   | { type: 'openModal'; modal: string }
//   | { type: 'none' };

  export type HeroAction =
  | { type: 'goToPage'; page: number }
  | { type: 'openModal'; modal: string }
  | { type: 'openStory' }
  | { type: 'none' };

export interface HeroSlide {
  id: string;
  image: string;
  badge: string;
  badgeType?: 'category' | 'sponsored';
  titleLine1: string;
  titleLine2?: string;
  subtitle: string;
  excerpt: string;
  body?: string;
  author?: string;
  date?: string;
  ctas: { label: string; action: HeroAction }[];
}

export interface StoryCard {
  id: string;
  size: 'large' | 'medium' | 'small';
  image: string;
  category: string;
  title: string;
  excerpt?: string;
  cta: string;
}

export interface Contestant {
  id: string;
  name: string;
  tagline: string;
  image: string;
  reward: string;
}

export interface VotingCategory {
  id: string;
  key: string;
  label: string;
  emoji: string;
  panelTitle: string;
  initialVotes: number;
  initialBarWidth: number;
  contestants: Contestant[];
}

export interface CogvanaCover {
  id: string;
  image: string;
  eyebrow: string;
  title: string;
}

export interface MasonryImage {
  id: string;
  thumb: string;
  full: string;
}

export interface ServiceItem {
  id: string;
  image: string;
  eyebrow: string;
  title: string;
}

export interface PartnerCategory {
  id: string;
  emoji: string;
  label: string;
}

export interface FeaturedPartner {
  id: string;
  image: string;
  badge: string;
  name: string;
}

export interface SponsoredStoryCard {
  id: string;
  image: string;
  title: string;
}

export interface Product {
  id: string;
  image: string;
  category: string;
  name: string;
  price: number;
  wide?: boolean;
  digital?: boolean;
}

export interface Testimonial {
  id: string;
  quote: string;
  image: string;
  name: string;
  role: string;
}

export interface CartItem {
  name: string;
  price: number;
  qty: number;
}
