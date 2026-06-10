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
  .swiper { width: 100%; padding-bottom: 50px; }
  .swiper-slide { background-position: center; background-size: cover; width: 300px; }
  .swiper-slide img { display: block; width: 100%; object-fit: contain; }
  .swiper-3d .swiper-slide-shadow-left { background-image: none; }
  .swiper-3d .swiper-slide-shadow-right{ background: none; }
  `
  return (
    <section className="w-full py-4">
      <style>{css}</style>
      <div className="w-full">
        <Swiper
          spaceBetween={30}
          effect={"coverflow"}
          grabCursor={true}
          centeredSlides={true}
          loop={false}
          slidesPerView={"auto"}
          coverflowEffect={{
            rotate: 0,
            stretch: 0,
            depth: 100,
            modifier: 2.5,
          }}
          pagination={showPagination ? { clickable: true } : false}
          navigation={showNavigation}
          modules={[EffectCoverflow, Pagination, Navigation]}
        >
          {images.map((image) => (
            <SwiperSlide key={image.id} onClick={() => onImageClick && onImageClick(image)}>
              <div className="size-full rounded-3xl cursor-pointer">
                <img
                  src={image.src}
                  className="size-full rounded-xl"
                  alt={image.alt}
                />
                <p className="text-center mt-2 text-sm text-neutral-400">{image.date}</p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  )
}
