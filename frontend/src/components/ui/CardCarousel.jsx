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
    }
    .swiper-slide img {
      height: 100% !important;
      width: auto !important;
      object-fit: contain !important;
      border-radius: 8px;
    }
    /* Reduz o tamanho das bolinhas de paginação */
    .swiper-pagination-bullet {
      width: 6px !important;
      height: 6px !important;
      margin: 0 4px !important;
    }
    /* Esconde as sombras padrões do swiper para um visual mais limpo */
    .swiper-3d .swiper-slide-shadow-left,
    .swiper-3d .swiper-slide-shadow-right {
      display: none !important;
    }
  `;

  return (
    <section className="w-full py-4 -mx-6" style={{ width: 'calc(100% + 3rem)' }}>
      <style>{css}</style>
      <div className="w-full">
        <Swiper
          effect={"coverflow"} /* OBRIGATÓRIO PARA O 3D */
          grabCursor={true}
          centeredSlides={true}
          slidesPerView={"auto"}
          spaceBetween={-20} /* Valor negativo junta as fotos e remove o espaçamento */
          coverflowEffect={{
            rotate: 0,
            stretch: 0,
            depth: 150, /* Profundidade do 3D (faz as laterais ficarem menores) */
            modifier: 2.5, /* Intensidade da sobreposição */
            slideShadows: false,
          }}
          pagination={{ clickable: true }}
          navigation={false}
          modules={[EffectCoverflow, Pagination]}
          key={images.length}
          initialSlide={images.length > 0 ? images.length - 1 : 0}
          slideToClickedSlide={true}
          watchSlidesProgress={true}
        >
          {images.map((image, index) => (
            <SwiperSlide key={image.id || index}>
              {({ isActive }) => (
                <div
                  className="cursor-pointer h-full"
                  onClick={() => {
                    if (isActive && onImageClick) {
                      onImageClick(image);
                    }
                  }}
                >
                  <img src={image.src} alt={image.alt || `Slide ${index}`} />
                </div>
              )}
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};
