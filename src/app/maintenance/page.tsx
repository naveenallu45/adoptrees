import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Maintenance',
  robots: {
    index: false,
    follow: false,
  },
};

export default function MaintenancePage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-emerald-50 via-white to-green-100 px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(16, 185, 129, 0.18), transparent 40%), radial-gradient(circle at 80% 70%, rgba(5, 150, 105, 0.14), transparent 45%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-xl text-center">
        <div className="mx-auto mb-6 flex justify-center">
          <Image
            src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1762682129/WhatsApp_Image_2025-10-17_at_7.25.07_PM_vqytis.png"
            alt="Adoptrees"
            width={140}
            height={140}
            className="h-28 w-28 object-contain sm:h-32 sm:w-32"
            priority
          />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          We&apos;ll be right back
        </h1>
        <p className="mt-5 text-base leading-relaxed text-gray-600 sm:text-lg">
          We apologize for the inconvenience. Adoptrees is temporarily
          unavailable while we resolve a technical issue. We&apos;ll restore
          normal service as soon as possible. Thank you for your patience.
        </p>
        <p className="mt-8 text-sm text-gray-500">
          Please check back again shortly.
        </p>
      </div>
    </div>
  );
}
