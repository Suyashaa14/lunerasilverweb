import { Hero } from './components/Hero';
import { HeroHeader } from './components/HeroHeader';
import { LandingContent } from './components/LandingContent';

function App() {
  return (
    <>
      <HeroHeader />
      <Hero fmt={() => ''} onOpenBespoke={() => {}} />
      <LandingContent />
    </>
  );
}

export default App;
