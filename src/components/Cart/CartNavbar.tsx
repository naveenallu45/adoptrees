'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function CartNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-1 sm:py-1.5">
        <div className="flex items-center justify-between">
          {/* Logo Only */}
          <div className="flex items-center">
            <Link href="/">
              <Image
                src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760778346/WhatsApp_Image_2025-10-18_at_2.35.31_PM_ndgk70.jpg"
                alt="Adoptrees Logo"
                width={120}
                height={120}
                className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20"
                priority
              />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
