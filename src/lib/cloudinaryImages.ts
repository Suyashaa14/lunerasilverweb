const CLOUD_NAME = "dpwrvmx3r";
const BASE = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto`;

export const cloudinaryImages = {
  heroBackground: `${BASE}/v1789488023/lunerasilver/website/hero-background.png`,
  ganeshLocket: `${BASE}/v1789488025/lunerasilver/website/ganeshlocket.png`,
  halfImage: `${BASE}/v1789488027/lunerasilver/website/halfimage.png`,
  logo: `${BASE}/v1789488028/lunerasilver/website/logo.png`,
  luneraRing: `${BASE}/v1789488029/lunerasilver/website/luneraring.jpg`,
  heroMain: `${BASE}/v1789488031/lunerasilver/website/hero-main.png`,
  pearlRing: `${BASE}/v1789488032/lunerasilver/website/pearl-ring.jpg`,
  pearlBracelet: `${BASE}/v1789488034/lunerasilver/website/pearlbracelet.png`,
  pearlEarring: `${BASE}/v1789488036/lunerasilver/website/pearlearring.png`,
  pearlSilverTop: `${BASE}/v1789488038/lunerasilver/website/pearlsilvertop.png`,
  ring1: `${BASE}/v1789488041/lunerasilver/website/ring1.png`,
  ring2: `${BASE}/v1789488044/lunerasilver/website/ring2.png`,
  squareRing: `${BASE}/v1789488046/lunerasilver/website/squarering.png`,
  stoneRing: `${BASE}/v1789488048/lunerasilver/website/stonering.png`,
  turtleRing: `${BASE}/v1789488049/lunerasilver/website/turtle-ring.png`,
} as const;
