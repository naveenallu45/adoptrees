'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function CartNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-0 sm:py-[1.25px]">
        <div className="flex items-center justify-between">
          {/* Logo Only */}
          <div className="flex items-center">
            <Link 
              href="/"
              className="flex items-center transition-transform duration-300 hover:scale-105 active:scale-95"
              aria-label="Adoptrees Home"
            >
              <div className="relative w-[74px] h-[74px] sm:w-[74px] sm:h-[74px] md:w-[88px] md:h-[88px] lg:w-[102px] lg:h-[102px] xl:w-[116px] xl:h-[116px] 2xl:w-[130px] 2xl:h-[130px] flex-shrink-0">
                <Image
                  src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1762682129/WhatsApp_Image_2025-10-17_at_7.25.07_PM_vqytis.png"
                  alt="Adoptrees Logo"
                  fill
                  className="object-contain object-center transition-opacity duration-300"
                  sizes="(max-width: 640px) 74px, (max-width: 768px) 74px, (max-width: 1024px) 88px, (max-width: 1280px) 102px, (max-width: 1536px) 116px, 130px"
                  priority
                  quality={90}
                />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
