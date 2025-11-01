import { useEffect, useRef } from 'react';

interface Stage {
  width: number;
  height: number;
}



class Peep {
  image: HTMLImageElement;
  rect: number[];
  width: number;
  height: number;
  drawArgs: any[];
  x: number;
  y: number;
  anchorY: number;
  scaleX: number;
  walk: any;

  constructor({ image, rect }: { image: HTMLImageElement; rect: number[] }) {
    this.image = image;
    this.rect = rect;
    this.width = rect[2];
    this.height = rect[3];
    this.x = 0;
    this.y = 0;
    this.anchorY = 0;
    this.scaleX = 1;
    this.walk = null;
    this.drawArgs = [this.image, ...rect, 0, 0, this.width, this.height];
  }

  setRect(rect: number[]) {
    this.rect = rect;
    this.width = rect[2];
    this.height = rect[3];
    this.drawArgs = [this.image, ...rect, 0, 0, this.width, this.height];
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scaleX, 1);
    ctx.drawImage(
      this.image,
      this.rect[0],
      this.rect[1],
      this.rect[2],
      this.rect[3],
      0,
      0,
      this.width,
      this.height
    );
    ctx.restore();
  }
}

const CrowdSparkHero = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Load Google Font
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    // Load GSAP from CDN
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      const gsap = (window as any).gsap;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const config = {
        src: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/175711/open-peeps-sheet.png',
        rows: 15,
        cols: 7,
      };

      const randomRange = (min: number, max: number) => min + Math.random() * (max - min);
      const randomIndex = (array: any[]) => randomRange(0, array.length) | 0;
      const removeFromArray = (array: any[], i: number) => array.splice(i, 1)[0];
      const removeItemFromArray = (array: any[], item: any) => removeFromArray(array, array.indexOf(item));
      const removeRandomFromArray = (array: any[]) => removeFromArray(array, randomIndex(array));
      const getRandomFromArray = (array: any[]) => array[randomIndex(array) | 0];

      const stage: Stage = { width: 0, height: 0 };
      const allPeeps: Peep[] = [];
      const availablePeeps: Peep[] = [];
      const crowd: Peep[] = [];

      const resetPeep = ({ stage, peep }: { stage: Stage; peep: Peep }) => {
        const direction = Math.random() > 0.5 ? 1 : -1;
        const offsetY = 100 - 250 * gsap.parseEase('power2.in')(Math.random());
        const startY = stage.height - peep.height + offsetY;
        let startX: number, endX: number;

        if (direction === 1) {
          startX = -peep.width;
          endX = stage.width;
          peep.scaleX = 1;
        } else {
          startX = stage.width + peep.width;
          endX = 0;
          peep.scaleX = -1;
        }

        peep.x = startX;
        peep.y = startY;
        peep.anchorY = startY;

        return { startX, startY, endX };
      };

      const normalWalk = ({ peep, props }: { peep: Peep; props: any }) => {
        const {startY, endX } = props;
        const xDuration = 10;
        const yDuration = 0.25;

        const tl = gsap.timeline();
        tl.timeScale(randomRange(0.5, 1.5));
        tl.to(peep, { duration: xDuration, x: endX, ease: 'none' }, 0);
        tl.to(
          peep,
          {
            duration: yDuration,
            repeat: xDuration / yDuration,
            yoyo: true,
            y: startY - 10,
          },
          0
        );

        return tl;
      };

      const walks = [normalWalk];

      const createPeeps = (img: HTMLImageElement) => {
        const { rows, cols } = config;
        const { naturalWidth: width, naturalHeight: height } = img;
        const total = rows * cols;
        const rectWidth = width / rows;
        const rectHeight = height / cols;

        for (let i = 0; i < total; i++) {
          allPeeps.push(
            new Peep({
              image: img,
              rect: [
                (i % rows) * rectWidth,
                ((i / rows) | 0) * rectHeight,
                rectWidth,
                rectHeight,
              ],
            })
          );
        }
      };

      const addPeepToCrowd = () => {
        const peep = removeRandomFromArray(availablePeeps);
        const walk = getRandomFromArray(walks)({
          peep,
          props: resetPeep({ peep, stage }),
        }).eventCallback('onComplete', () => {
          removePeepFromCrowd(peep);
          addPeepToCrowd();
        });

        peep.walk = walk;
        crowd.push(peep);
        crowd.sort((a, b) => a.anchorY - b.anchorY);

        return peep;
      };

      const removePeepFromCrowd = (peep: Peep) => {
        removeItemFromArray(crowd, peep);
        availablePeeps.push(peep);
      };

      const render = () => {
        if (!canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(devicePixelRatio, devicePixelRatio);

        crowd.forEach((peep) => {
          peep.render(ctx);
        });

        ctx.restore();
      };

      const initCrowd = () => {
        while (availablePeeps.length) {
          addPeepToCrowd().walk.progress(Math.random());
        }
      };

      const resize = () => {
        if (!canvas) return;
        stage.width = canvas.clientWidth;
        stage.height = canvas.clientHeight;
        canvas.width = stage.width * devicePixelRatio;
        canvas.height = stage.height * devicePixelRatio;

        crowd.forEach((peep) => {
          peep.walk.kill();
        });

        crowd.length = 0;
        availablePeeps.length = 0;
        availablePeeps.push(...allPeeps);

        initCrowd();
      };

      const init = () => {
        createPeeps(img);
        resize();
        gsap.ticker.add(render);
      };

      const img = document.createElement('img');
      img.onload = init;
      img.src = config.src;

      const handleResize = () => resize();
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        gsap.ticker.remove(render);
        crowd.forEach((peep) => {
          if (peep.walk) peep.walk.kill();
        });
      };
    };

    return () => {
      const scripts = document.querySelectorAll('script[src*="gsap"]');
      scripts.forEach(s => s.remove());
      const fontLinks = document.querySelectorAll('link[href*="fonts.googleapis"]');
      fontLinks.forEach(l => l.remove());
    };
  }, []);

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      overflow: 'hidden',
    }}>
      {/* Navbar */}
      <nav style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        padding: '1.5rem 3rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{
          fontSize: '20px',
          fontWeight: '700',
          color: '#006239',
          fontFamily: "'Outfit', sans-serif"
        }}>
          CrowdSpark
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '14px',
        }}>
          <a href="#" style={{ color: '#6b7280', textDecoration: 'none', fontWeight: '500' }}>Pricing</a>
          <a href="#" style={{ color: '#6b7280', textDecoration: 'none', fontWeight: '500' }}>Docs</a>
          <a href="#" style={{ color: '#6b7280', textDecoration: 'none', fontWeight: '500' }}>Careers</a>
          <a href="#" style={{ color: '#6b7280', textDecoration: 'none', fontWeight: '500' }}>Log in</a>
          <button style={{
            padding: '8px 16px',
            backgroundColor: '#006239',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
          }}>
            Sign up
          </button>
        </div>
      </nav>

      {/* Hero Content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        paddingLeft: '2rem',
        paddingRight: '2rem',
        maxWidth: '1100px',
        margin: '0 auto',
        paddingTop: '15vh',
        paddingBottom: '8vh',
      }}>
        {/* Top tag */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '20px',
          marginBottom: '1.5rem',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '13px',
          fontWeight: '500',
          color: '#166534',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            backgroundColor: '#22c55e',
            borderRadius: '50%',
          }}></span>
          Now in Beta
        </div>

        <h1 style={{
          fontSize: 'clamp(48px, 8vw, 96px)',
          fontWeight: '700',
          letterSpacing: '0.025em',
          lineHeight: 1.1,
          color: '#1a1a1a',
          margin: 0,
          marginBottom: '1.5rem',
          fontFamily: "'Outfit', sans-serif"
        }}>
          Collective{' '}
          <span style={{
            background: 'linear-gradient(135deg, #006239 0%, #00a86b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            brainstorming
          </span>
          <br />
          <span style={{ color: '#9ca3af' }}>for creative teams</span>
        </h1>

        <p style={{
          fontSize: '18px',
          color: '#6b7280',
          margin: '0 auto',
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 400,
          letterSpacing: '0.015em',
          lineHeight: 1.6,
          maxWidth: '650px',
          marginBottom: '2rem',
        }}>
          Harness the creativity of the crowd to generate, refine, and validate ideas in real time through AI-assisted clustering and insight tools.
        </p>

        {/* Feature tags */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '14px',
        }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '20px',
            color: '#166534',
            fontWeight: '500',
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              backgroundColor: '#22c55e',
              borderRadius: '50%',
            }}></span>
            AI Clustering
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '20px',
            color: '#166534',
            fontWeight: '500',
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              backgroundColor: '#22c55e',
              borderRadius: '50%',
            }}></span>
            Real-time Voting
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '20px',
            color: '#166534',
            fontWeight: '500',
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              backgroundColor: '#22c55e',
              borderRadius: '50%',
            }}></span>
            Insights
          </span>
        </div>

        {/* CTA Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          <button 
            className="sparkle-button"
            style={{
              position: 'relative',
              padding: '12px 35px',
              background: '#006239',
              fontSize: '15px',
              fontWeight: '600',
              color: '#ffffff',
              border: '3px solid #006239',
              borderRadius: '8px',
              boxShadow: '0 0 0 #00623980',
              transition: 'all 0.3s ease-in-out',
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
              overflow: 'visible',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#006239';
              e.currentTarget.style.boxShadow = '0 0 25px #00623980';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#006239';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.boxShadow = '0 0 0 #00623980';
            }}
          >
            Start Free Trial
            <div className="star-1" style={{
              position: 'absolute',
              top: '20%',
              left: '20%',
              width: '25px',
              height: 'auto',
              filter: 'drop-shadow(0 0 0 #fffdef)',
              zIndex: -5,
              transition: 'all 1s cubic-bezier(0.05, 0.83, 0.43, 0.96)',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53">
                <path fill="#fffdef" d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"></path>
              </svg>
            </div>
            <div className="star-2" style={{
              position: 'absolute',
              top: '45%',
              left: '45%',
              width: '15px',
              height: 'auto',
              filter: 'drop-shadow(0 0 0 #fffdef)',
              zIndex: -5,
              transition: 'all 1s cubic-bezier(0, 0.4, 0, 1.01)',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53">
                <path fill="#fffdef" d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"></path>
              </svg>
            </div>
            <div className="star-3" style={{
              position: 'absolute',
              top: '40%',
              left: '40%',
              width: '5px',
              height: 'auto',
              filter: 'drop-shadow(0 0 0 #fffdef)',
              zIndex: -5,
              transition: 'all 1s cubic-bezier(0, 0.4, 0, 1.01)',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53">
                <path fill="#fffdef" d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"></path>
              </svg>
            </div>
            <div className="star-4" style={{
              position: 'absolute',
              top: '20%',
              left: '40%',
              width: '8px',
              height: 'auto',
              filter: 'drop-shadow(0 0 0 #fffdef)',
              zIndex: -5,
              transition: 'all 0.8s cubic-bezier(0, 0.4, 0, 1.01)',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53">
                <path fill="#fffdef" d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"></path>
              </svg>
            </div>
            <div className="star-5" style={{
              position: 'absolute',
              top: '25%',
              left: '45%',
              width: '15px',
              height: 'auto',
              filter: 'drop-shadow(0 0 0 #fffdef)',
              zIndex: -5,
              transition: 'all 0.6s cubic-bezier(0, 0.4, 0, 1.01)',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53">
                <path fill="#fffdef" d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"></path>
              </svg>
            </div>
            <div className="star-6" style={{
              position: 'absolute',
              top: '5%',
              left: '50%',
              width: '5px',
              height: 'auto',
              filter: 'drop-shadow(0 0 0 #fffdef)',
              zIndex: -5,
              transition: 'all 0.8s ease',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53">
                <path fill="#fffdef" d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"></path>
              </svg>
            </div>
          </button>
          <button 
            className="circle-button"
            style={{
              fontFamily: "'Outfit', sans-serif",
              display: 'inline-block',
              padding: '12px 35px',
              position: 'relative',
              cursor: 'pointer',
              overflow: 'hidden',
              border: '2px solid #006239',
              transition: 'color 0.5s',
              zIndex: 1,
              fontSize: '15px',
              borderRadius: '8px',
              fontWeight: '600',
              color: '#006239',
              backgroundColor: 'transparent',
            }}
          >
            View Demo
            <div style={{
              content: '""',
              position: 'absolute',
              zIndex: -1,
              background: '#006239',
              height: '150px',
              width: '200px',
              borderRadius: '50%',
              top: '100%',
              left: '100%',
              transition: 'all 0.7s',
            }} className="circle-bg"></div>
          </button>
        </div>
        
        <style>{`
          .sparkle-button:hover .star-1 {
            top: -80% !important;
            left: -30% !important;
            filter: drop-shadow(0 0 10px #fffdef) !important;
            z-index: 2 !important;
          }
          .sparkle-button:hover .star-2 {
            top: -25% !important;
            left: 10% !important;
            filter: drop-shadow(0 0 10px #fffdef) !important;
            z-index: 2 !important;
          }
          .sparkle-button:hover .star-3 {
            top: 55% !important;
            left: 25% !important;
            filter: drop-shadow(0 0 10px #fffdef) !important;
            z-index: 2 !important;
          }
          .sparkle-button:hover .star-4 {
            top: 30% !important;
            left: 80% !important;
            filter: drop-shadow(0 0 10px #fffdef) !important;
            z-index: 2 !important;
          }
          .sparkle-button:hover .star-5 {
            top: 25% !important;
            left: 115% !important;
            filter: drop-shadow(0 0 10px #fffdef) !important;
            z-index: 2 !important;
          }
          .sparkle-button:hover .star-6 {
            top: 5% !important;
            left: 60% !important;
            filter: drop-shadow(0 0 10px #fffdef) !important;
            z-index: 2 !important;
          }
          .circle-button:hover {
            color: #fff !important;
          }
          .circle-button:hover .circle-bg {
            top: -30px !important;
            left: -30px !important;
          }
          .circle-button:active .circle-bg {
            background: #004d2d !important;
            transition: background 0s !important;
          }
        `}</style>
      </div>

      {/* Canvas at bottom */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '75vh',
          display: 'block',
        }}
      />
    </div>
  );
};

export default CrowdSparkHero;