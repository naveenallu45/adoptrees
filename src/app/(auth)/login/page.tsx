import { Suspense } from "react";
import Image from "next/image";
import LoginForm from "@/components/Auth/LoginForm";
import AuthRedirect from "@/components/Auth/AuthRedirect";

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthRedirect>
        <div className="min-h-screen relative overflow-hidden">
          {/* Background Image */}
          <Image
            src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1762684703/pexels-markusspiske-117843_1_oalacr.jpg"
            alt="Login background"
            fill
            className="object-cover"
            priority
            quality={85}
            sizes="100vw"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
          />
          
          {/* Dark Overlay for better text readability */}
          <div className="absolute inset-0 bg-black/40 z-10" />
          
          {/* Content */}
          <div className="relative z-20 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 md:pt-28 lg:pt-32 pb-8">
            <LoginForm />
          </div>
        </div>
      </AuthRedirect>
    </Suspense>
  );
}


