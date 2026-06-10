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
  // Sort images descending (most recent first)
  const sortedImages = React.useMemo(() => {
    return [...images].sort((a, b) => {
      const dateA = a.raw?.data_foto ? new Date(a.raw.data_foto) : new Date(0);
      const dateB = b.raw?.data_foto ? new Date(b.raw.data_foto) : new Date(0);
      return dateB - dateA;
    });
  }, [images]);

  const css = `
  .swiper {
    width: 100%;
    padding-bottom: 50px;
    --swiper-theme-color: var(--color-primary);
    --swiper-navigation-color: var(--color-primary);
    --swiper-pagination-color: var(--color-primary);
  }
  .swiper-pagination-bullet-active {
    background-color: var(--color-primary) !important;
  }
  .swiper-slide {
    background-position: center;
    background-size: cover;
    width: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .swiper-slide img {
    display: block;
    max-height: 40vh;
    width: auto;
    object-fit: contain;
    border-radius: 24px;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
  }
  .swiper-3d .swiper-slide-shadow-left { background-image: none; }
  .swiper-3d .swiper-slide-shadow-right{ background: none; }
  `
  return (
    <section className="w-full py-4 -mx-6" style={{ width: 'calc(100% + 3rem)' }}>
      <style>{css}</style>
      <div className="w-full">
        <Swiper
          spaceBetween={10}
          effect={"coverflow"}
          grabCursor={true}
          centeredSlides={true}
          loop={false}
          slidesPerView={"auto"}
          coverflowEffect={{
            rotate: 0,
            stretch: 10,
            depth: 150,
            modifier: 1.5,
          }}
          pagination={showPagination ? { clickable: true } : false}
          navigation={showNavigation}
          modules={[EffectCoverflow, Pagination, Navigation]}
        >
          {sortedImages.map((image) => (
            <SwiperSlide key={image.id} onClick={() => onImageClick && onImageClick(image)}>
              <div className="cursor-pointer transition-transform duration-300">
                <img
                  src={image.src}
                  alt={image.alt}
                />
                <p className="text-center mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{image.date}</p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  )
}
