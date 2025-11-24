import CreateForestHero from '@/components/CreateForest/CreateForestHero';
import MomentsThatDeserve from '@/components/CreateForest/MomentsThatDeserve';
import HowItWorksForest from '@/components/CreateForest/HowItWorksForest';
import FromOurCommunity from '@/components/CreateForest/FromOurCommunity';

export default function CreateForestPage() {
  return (
    <main className="bg-white">
      <CreateForestHero />
      <MomentsThatDeserve />
      <HowItWorksForest />
      <FromOurCommunity />
    </main>
  );
}

