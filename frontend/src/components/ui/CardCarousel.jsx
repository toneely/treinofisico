import React from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import "swiper/css"
import "swiper/css/effect-coverflow"
import "swiper/css/pagination"
import "swiper/css/navigation"
import { EffectCoverflow, Pagination } from "swiper/modules"

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
    padding-bottom: 30px !important;
    --swiper-theme-color: var(--color-primary);
    --swiper-navigation-color: var(--color-primary);
    --swiper-pagination-color: var(--color-primary);
  }
  .swiper-pagination-bullet-active {
    background-color: var(--color-primary) !important;
  }
  .swiper-button-next, .swiper-button-prev { display: none !important; }
  .swiper-button-next::after, .swiper-button-prev::after {
    font-size: 24px !important;
  }
  .swiper-slide {
    width: auto !important;
    height: 120px !important;
    display: flex;
    justify-content: center;
    align-items: center;
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
          pagination={showPagination ? { clickable: true } : false}
          navigation={false}
          modules={[EffectCoverflow, Pagination]}
          onClick={(swiper) => {
            if (onImageClick && swiper.clickedIndex !== undefined) {
              onImageClick(images[swiper.clickedIndex]);
            }
          }}
        >
          {images.map((image) => (
            <SwiperSlide key={image.id}>
              <div className="cursor-pointer transition-transform duration-300 h-full flex flex-col items-center">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="flex-1 min-h-0"
                />
                <p className="text-center mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{image.date}</p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  )
}
