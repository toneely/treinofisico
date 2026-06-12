import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import { EffectCoverflow, Pagination } from "swiper/modules";

export const CardCarousel = ({ images = [], onImageClick }) => {
  const css = `
    .swiper {
      width: 100%;
      padding-bottom: 30px !important;
    }
    .swiper-slide {
      width: auto !important;
      height: 120px !important;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    }
    .swiper-slide img {
      height: 100% !important;
      width: auto !important;
      object-fit: contain !important;
      border-radius: 8px;
    }
    .swiper-pagination-bullet {
      width: 6px !important;
      height: 6px !important;
      margin: 0 4px !important;
    }
    .swiper-3d .swiper-slide-shadow-left, .swiper-3d .swiper-slide-shadow-right {
      display: none !important;
    }
    .date-overlay {
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 9px;
      font-weight: 900;
      color: var(--color-primary-safe, white);
      background: rgba(0,0,0,0.6);
      padding: 2px 6px;
      border-radius: 6px;
      pointer-events: none;
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: 0.15em;
    }
  `;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      // Assuming ISO format YYYY-MM-DD
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year.slice(-2)}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <section className="w-full py-4 -mx-6" style={{ width: 'calc(100% + 3rem)' }}>
      <style>{css}</style>
      <div className="w-full">
        <Swiper
          effect={"coverflow"}
          grabCursor={true}
          centeredSlides={true}
          slidesPerView={"auto"}
          spaceBetween={-20}
          coverflowEffect={{
            rotate: 0,
            stretch: 0,
            depth: 150,
            modifier: 2.5,
            slideShadows: false,
          }}
          pagination={{ clickable: true }}
          navigation={false}
          modules={[EffectCoverflow, Pagination]}
          initialSlide={images.length > 0 ? images.length - 1 : 0}
          key={images.length}
          slideToClickedSlide={true}
          watchSlidesProgress={true}
        >
          {images.map((image, index) => (
            <SwiperSlide key={image.id || index}>
              {({ isActive }) => (
                <div
                  className="size-full cursor-pointer relative flex items-center justify-center"
                  onClick={() => {
                    if (isActive && onImageClick) {
                      onImageClick(image);
                    }
                  }}
                >
                  <img src={image.src} alt={image.alt || `Slide ${index}`} />
                  {image.date && (
                    <span className="date-overlay">
                      {formatDate(image.date)}
                    </span>
                  )}
                </div>
              )}
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};
