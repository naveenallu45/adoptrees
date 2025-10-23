'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function CartNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo Only */}
          <div className="flex items-center">
            <Link href="/">
              <Image
                src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760778346/WhatsApp_Image_2025-10-18_at_2.35.31_PM_ndgk70.jpg"
                alt="Adoptrees Logo"
                width={150}
                height={150}
                priority
              />
            </Link>
          </div>

        </div>
      </div>
    </nav>
  );
}
