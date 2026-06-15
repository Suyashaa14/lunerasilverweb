export interface Product {
  id: string;
  cat: string;
  name: string;
  sub: string;
  price: number;
  weight: string;
  tag: string | null;
}

export interface Collection {
  id: string;
  label: string;
  numeral: string;
  blurb: string;
}

export interface Testimonial {
  q: string;
  a: string;
  m: string;
}

export interface CartItem extends Product {
  qty: number;
}

export const COLLECTIONS: Collection[] = [
  { id: 'rings',     label: 'Rings',     numeral: 'I',   blurb: 'Crescent solitaires & moonlit halos' },
  { id: 'lockets',   label: 'Lockets',   numeral: 'II',  blurb: 'Heirlooms to hold a moment of light' },
  { id: 'chains',    label: 'Chains',    numeral: 'III', blurb: 'From whisper-thin to woven rope' },
  { id: 'bracelets', label: 'Bracelets', numeral: 'IV',  blurb: 'Bangles, cuffs & orbiting links' },
];

export const PRODUCTS: Product[] = [
  // Rings
  { id: 'r1', cat: 'rings', name: 'Selene Halo',        sub: 'Solitaire ring',    price: 8400,  weight: '4.2g',  tag: 'Bestseller' },
  { id: 'r2', cat: 'rings', name: 'Crescent Solitaire', sub: 'Engagement ring',   price: 12600, weight: '5.6g',  tag: 'New' },
  { id: 'r3', cat: 'rings', name: 'Eclipse Band',       sub: 'Stacking band',     price: 4900,  weight: '3.1g',  tag: null },
  { id: 'r4', cat: 'rings', name: 'Astra Three-Stone',  sub: 'Cocktail ring',     price: 14200, weight: '6.4g',  tag: 'Limited' },
  // Lockets
  { id: 'l1', cat: 'lockets', name: 'Luna Locket',         sub: 'Oval, engravable', price: 7800, weight: '6.0g',  tag: 'Bestseller' },
  { id: 'l2', cat: 'lockets', name: 'Penumbra Heart',      sub: 'Hinged heart',     price: 6200, weight: '5.4g',  tag: null },
  { id: 'l3', cat: 'lockets', name: 'Constellation Disk',  sub: 'Round, etched',    price: 8900, weight: '7.1g',  tag: 'New' },
  { id: 'l4', cat: 'lockets', name: 'Orbit Coin',          sub: 'Bezel pendant',    price: 5400, weight: '4.8g',  tag: null },
  // Chains
  { id: 'c1', cat: 'chains', name: 'Moonchain Rope',    sub: '2.4mm rope chain', price: 3200, weight: '8.4g',   tag: null },
  { id: 'c2', cat: 'chains', name: 'Stardust Cable',    sub: '1.8mm cable',      price: 2600, weight: '6.0g',   tag: 'Bestseller' },
  { id: 'c3', cat: 'chains', name: 'Twilight Box',      sub: '2.2mm box',        price: 3800, weight: '9.2g',   tag: null },
  { id: 'c4', cat: 'chains', name: 'Nebula Herringbone',sub: '4.0mm flat',       price: 5400, weight: '12.6g',  tag: 'New' },
  // Bracelets
  { id: 'b1', cat: 'bracelets', name: 'Phase Bangle',  sub: 'Hammered bangle', price: 6400, weight: '14.2g', tag: null },
  { id: 'b2', cat: 'bracelets', name: 'Orbit Link',    sub: 'Cable bracelet',  price: 4800, weight: '9.0g',  tag: 'Bestseller' },
  { id: 'b3', cat: 'bracelets', name: 'Cosmos Cuff',   sub: 'Wide open cuff',  price: 9200, weight: '18.4g', tag: 'Limited' },
  { id: 'b4', cat: 'bracelets', name: 'Tide Anklet',   sub: 'Charm anklet',    price: 3400, weight: '5.6g',  tag: 'New' },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    q: 'My wedding band took three fittings and four sketches. I have never felt more cared for as a customer.',
    a: 'Ananya R.', m: 'Bespoke client · Mumbai',
  },
  {
    q: 'The Luna Locket arrived in a velvet pouch that still smells faintly of jasmine. The piece itself is impossibly fine.',
    a: 'Helena W.', m: 'Verified buyer · London',
  },
  {
    q: 'Six weeks from sketch to finished cuff. Solid, hallmarked, with a story I can actually tell.',
    a: 'Rohan K.', m: 'Bespoke client · Bengaluru',
  },
];

export const PRESS = ['Vogue India', 'Verve', 'Architectural Digest', 'Hindustan Times', 'Femina', 'Elle'];

export type Currency = 'INR' | 'USD' | 'GBP';

export const RATES: Record<Currency, number> = { INR: 1, USD: 0.012, GBP: 0.0095 };
export const SYMBOLS: Record<Currency, string> = { INR: '₹', USD: '$', GBP: '£' };

export function formatPrice(price: number, currency: Currency): string {
  const val = Math.round(price * RATES[currency]);
  return `${SYMBOLS[currency]}${val.toLocaleString()}`;
}
