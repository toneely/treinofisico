import { useEffect, useState, useRef } from 'react';

const AdBanner = ({ isPremium, variant = 'fixed', isLoading = false }) => {
  const [adStatus, setAdStatus] = useState('loading'); // 'loading', 'filled', 'failed'
  const adRef = useRef(null);

  useEffect(() => {
    if (isPremium || isLoading) return;

    const timeout = setTimeout(() => {
      if (adStatus === 'loading') {
        // If still loading after timeout, check if AdSense marked it as unfilled
        if (adRef.current && adRef.current.getAttribute('data-ad-status') === 'unfilled') {
          setAdStatus('failed');
        } else if (adRef.current && adRef.current.innerHTML === "") {
          // Or if it's just empty
          setAdStatus('failed');
        }
      }
    }, 4000);

    try {
      if (!window.adsbygoogle) {
        const script = document.createElement('script');
        script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1997524989701565";
        script.async = true;
        script.crossOrigin = "anonymous";
        script.onerror = () => setAdStatus('failed');
        document.head.appendChild(script);

        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({
          google_ad_client: "ca-pub-1997524989701565",
          enable_page_level_ads: true,
          overlays: { bottom: true }
        });
      }

      (window.adsbygoogle = window.adsbygoogle || []).push({});

      // AdSense doesn't provide a reliable 'onLoad' callback for units,
      // so we rely on the timeout and status check.
    } catch (error) {
      console.error("AdSense error:", error);
      setTimeout(() => setAdStatus('failed'), 0);
    }

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium, isLoading]);

  if (isPremium || isLoading || adStatus === 'failed') return null;

  const isFixed = variant === 'fixed' || variant === 'fixed-bottom';

  const containerClasses = isFixed
    ? `fixed ${variant === 'fixed' ? 'bottom-[72px]' : 'bottom-0'} left-0 right-0 z-40 px-6 max-w-md mx-auto pointer-events-none`
    : "w-full flex justify-center items-center bg-transparent my-2";

  return (
    <div className={containerClasses} style={isFixed ? { zIndex: 40 } : {}}>
      <div
        className={`w-full flex justify-center items-center bg-transparent ${isFixed ? 'pointer-events-auto' : ''}`}
        style={{ minHeight: '60px' }}
      >
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'inline-block', width: '320px', height: '50px' }}
          data-ad-client="ca-pub-1997524989701565"
          data-ad-slot="1234567890"
        ></ins>
      </div>
    </div>
  );
};

export default AdBanner;
