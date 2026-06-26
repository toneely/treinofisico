import React, { useEffect } from 'react';

const AdBanner = ({ isPremium, variant = 'fixed' }) => {
  if (isPremium) return null;

  useEffect(() => {
    try {
      if (!window.adsbygoogle) {
        const script = document.createElement('script');
        script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1997524989701565";
        script.async = true;
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);

        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({
          google_ad_client: "ca-pub-1997524989701565",
          enable_page_level_ads: true,
          overlays: { bottom: true }
        });
      }
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error("AdSense error:", error);
    }
  }, []);

  const containerClasses = variant === 'fixed'
    ? "fixed bottom-[72px] left-0 right-0 z-40 px-6 max-w-md mx-auto pointer-events-none"
    : "w-full flex justify-center items-center py-4";

  return (
    <div className={containerClasses}>
      <div
        className={`w-full flex justify-center items-center bg-transparent ${variant === 'fixed' ? 'pointer-events-auto' : ''}`}
        style={{ minHeight: '60px' }}
      >
        <ins className="adsbygoogle"
          style={{ display: 'inline-block', width: '320px', height: '50px' }}
          data-ad-client="ca-pub-1997524989701565"
          data-ad-slot="1234567890"
        ></ins>
      </div>
    </div>
  );
};

export default AdBanner;
