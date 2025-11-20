import Link from 'next/link';

export default function Footer() {
  const footerLinks = {
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Our Mission', href: '/about' }
    ],
    support: [
      { name: 'Help Center', href: '#help' },
      { name: 'Contact Us', href: '/contact' }
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms & Conditions', href: '/terms' },
      { name: 'Cookie Policy', href: '/cookies' },
      { name: 'Refund Policy', href: '/refund' },
      { name: 'Shipping & Delivery', href: '/shipping' }
    ]
  };

  return (
    <footer className="bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-2 mb-6 sm:mb-8 lg:mb-0">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold">Adoptrees</h3>
            </div>
            <p className="text-green-100 mb-4 sm:mb-6 leading-relaxed max-w-md text-sm sm:text-base">
              Together, we&apos;re planting hope. One tree today becomes a greener, healthier tomorrow.
            </p>
            <p className="text-green-100 mb-6 sm:mb-8 leading-relaxed max-w-md text-sm sm:text-base">
              Join our mission to create a future the next generation will thank us for.
            </p>
            
            {/* Newsletter Signup */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-8">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-green-800/50 border border-green-700/50 text-white placeholder-green-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent backdrop-blur-sm text-sm sm:text-base"
              />
              <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105 text-sm sm:text-base">
                Subscribe
              </button>
            </div>

            {/* Copyright */}
            <p className="text-green-200 text-xs sm:text-sm">
              © 2025 All rights reserved Adoptrees
            </p>
          </div>

          {/* Mobile: 3 columns in row, Desktop: separate columns */}
          <div className="grid grid-cols-3 lg:contents gap-4 lg:gap-0">
            {/* Company Links */}
            <div className="lg:mb-0">
              <h4 className="text-white font-bold text-sm lg:text-lg mb-2 sm:mb-3 lg:mb-6">Company</h4>
              <ul className="space-y-1 lg:space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    {link.href.startsWith('/') ? (
                      <Link
                        href={link.href}
                        className={`text-green-100 hover:text-white transition-colors duration-300 text-xs lg:text-base`}
                        style={link.name === 'About Us' ? { fontFamily: 'var(--font-work-sans), sans-serif' } : {}}
                      >
                        {link.name}
                      </Link>
                    ) : (
                    <a
                      href={link.href}
                      className={`text-green-100 hover:text-white transition-colors duration-300 text-xs lg:text-base ${link.name === 'About Us' ? "font-['Calibri']" : ''}`}
                    >
                      {link.name}
                    </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Support Links */}
            <div className="lg:mb-0">
              <h4 className="text-white font-bold text-sm lg:text-lg mb-2 sm:mb-3 lg:mb-6">Support</h4>
              <ul className="space-y-1 lg:space-y-3">
                {footerLinks.support.map((link) => (
                  <li key={link.name}>
                    {link.href.startsWith('/') ? (
                      <Link
                        href={link.href}
                        className="text-green-100 hover:text-white transition-colors duration-300 text-xs lg:text-base"
                      >
                        {link.name}
                      </Link>
                    ) : (
                    <a
                      href={link.href}
                      className="text-green-100 hover:text-white transition-colors duration-300 text-xs lg:text-base"
                    >
                      {link.name}
                    </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="text-white font-bold text-sm lg:text-lg mb-2 sm:mb-3 lg:mb-6">Legal</h4>
              <ul className="space-y-1 lg:space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.name}>
                    {link.href.startsWith('/') ? (
                      <Link
                        href={link.href}
                        className="text-green-100 hover:text-white transition-colors duration-300 text-xs lg:text-base"
                      >
                        {link.name}
                      </Link>
                    ) : (
                    <a
                      href={link.href}
                      className="text-green-100 hover:text-white transition-colors duration-300 text-xs lg:text-base"
                    >
                      {link.name}
                    </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}