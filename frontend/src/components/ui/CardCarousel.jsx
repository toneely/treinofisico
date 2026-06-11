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
  .swiper-slide {
    width: auto !important;
    height: 120px !important;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
  }
  .swiper-slide img {
    height: 95px !important; /* Altura fixa para sobrar 25px exatos para o texto da data */
    width: auto !important;
    object-fit: contain !important;
    border-radius: 8px;
    box-shadow: 0px 4px 12px rgba(0,0,0,0.1); /* Sombra para destacar o 3D */
    transition: transform 0.3s ease;
  }
  .swiper-pagination-bullet {
    width: 6px !important;
    height: 6px !important;
    margin: 0 4px !important;
  }
  .swiper-pagination {
    bottom: -5px !important;
  }
  .swiper-3d .swiper-slide-shadow-left { background-image: none !important; }
  .swiper-3d .swiper-slide-shadow-right{ background: none !important; }
  `
  return (
    <section className="w-full py-4 -mx-6" style={{ width: 'calc(100% + 3rem)' }}>
      <style>{css}</style>
      <div className="w-full">
        <Swiper
          key={images.length}
          initialSlide={images.length > 0 ? images.length - 1 : 0}
          effect={"coverflow"}
          grabCursor={true}
          centeredSlides={true}
          slidesPerView={"auto"}
          spaceBetween={-15} /* Ajustado para melhor encaixe 3D */
          slideToClickedSlide={true} /* Habilita clique para centralizar foto lateral */
          coverflowEffect={{
            rotate: 0,
            stretch: -10, /* Puxa levemente para o centro */
            depth: 250, /* Profundidade extrema para o 3D ficar óbvio */
            modifier: 3, /* Intensidade do redimensionamento lateral */
            slideShadows: false,
          }}
          pagination={showPagination ? { clickable: true } : false}
          navigation={false}
          modules={[EffectCoverflow, Pagination]}
        >
          {images.map((image) => (
            <SwiperSlide key={image.id}>
              {({ isActive }) => (
                <div
                  className="cursor-pointer h-full flex flex-col items-center justify-start"
                  onClick={() => {
                    if (isActive && onImageClick) {
                      onImageClick(image);
                    }
                  }}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="rounded-xl"
                  />
                  <p className="text-center mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {new Date(image.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </p>
                </div>
              )}
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  )
}
