import React from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import "swiper/css"
import "swiper/css/effect-coverflow"
import "swiper/css/pagination"
import "swiper/css/navigation"
import { EffectCoverflow, Navigation, Pagination } from "swiper/modules"

export const CardCarousel = ({
  images,
  autoplayDelay = 1500,
  showPagination = true,
  showNavigation = true,
  onImageClick
}) => {
  const css = `
  .swiper {
    width: 100%;
    padding-bottom: 40px !important;
    --swiper-theme-color: var(--color-primary);
    --swiper-navigation-color: var(--color-primary);
    --swiper-pagination-color: var(--color-primary);
  }
  .swiper-pagination-bullet-active {
    background-color: var(--color-primary) !important;
  }
  .swiper-button-next, .swiper-button-prev {
    height: 80px;
  }
  .swiper-button-next::after, .swiper-button-prev::after {
    font-size: 24px !important;
  }
  .swiper-slide {
    width: auto !important;
    height: 100px !important;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: transform 0.3s ease;
  }
  .swiper-slide img {
    height: 100% !important;
    width: auto !important;
    object-fit: contain !important;
    border-radius: 8px;
  }
  .swiper-pagination {
    bottom: -5px !important;
  }
  .swiper-3d .swiper-slide-shadow-left { background-image: none; }
  .swiper-3d .swiper-slide-shadow-right{ background: none; }
  `
  return (
    <section className="w-full py-4 -mx-6" style={{ width: 'calc(100% + 3rem)' }}>
      <style>{css}</style>
      <div className="w-full">
        <Swiper
          key={images.length}
          initialSlide={images.length - 1}
          spaceBetween={15}
          grabCursor={true}
          centeredSlides={true}
          loop={false}
          slidesPerView={"auto"}
          pagination={showPagination ? { clickable: true } : false}
          navigation={showNavigation}
          modules={[Pagination, Navigation]}
        >
          {images.map((image) => (
            <SwiperSlide key={image.id} onClick={() => onImageClick && onImageClick(image)}>
              <div className="cursor-pointer transition-transform duration-300 h-full flex flex-col items-center">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="flex-1 min-h-0"
                />
                <p className="text-center mt-1 text-[8px] font-black uppercase tracking-widest text-slate-400">{image.date}</p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  )
}
