import type { Metadata } from 'next';
import EcoCommunityClient from '@/components/EcoCommunity/EcoCommunityClient';

export const metadata: Metadata = {
  title: 'Eco Community',
  description: 'Connect with Eco Friends, send friend requests, and chat with individual Adoptrees users.',
};

export default function EcoCommunityPage() {
  return <EcoCommunityClient />;
}
