export default function Footer() {
  const footerLinks = {
    company: [
      { name: 'About Us', href: '#about' },
      { name: 'Our Mission', href: '#mission' },
      { name: 'Team', href: '#team' },
      { name: 'Blog', href: '#blog' }
    ],
    support: [
      { name: 'Help Center', href: '#help' },
      { name: 'Contact Us', href: '#contact' },
      { name: 'FAQ', href: '#faq' },
      { name: 'Tree Care Guide', href: '#guide' }
    ],
    legal: [
      { name: 'Privacy Policy', href: '#privacy' },
      { name: 'Terms of Service', href: '#terms' },
      { name: 'Cookie Policy', href: '#cookies' },
      { name: 'Refund Policy', href: '#refund' }
    ]
  };

  return (
    <footer className="bg-gradient-to-br from-purple-900 to-purple-1100 text-white">
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-2 mb-8 lg:mb-0">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-2xl font-bold">Adoptrees</h3>
            </div>
            <p className="text-purple-200 mb-8 leading-relaxed max-w-md">
              Making the world greener, one tree at a time. Join our mission to create a sustainable future for generations to come.
            </p>
            
            {/* Newsletter Signup */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg bg-purple-700/50 border border-purple-600/50 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent backdrop-blur-sm"
              />
              <button className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105">
                Subscribe
              </button>
            </div>

            {/* Copyright */}
            <p className="text-purple-300 text-sm">
              © 2024 All rights reserved Adoptrees
            </p>
          </div>

          {/* Mobile: 3 columns in row, Desktop: separate columns */}
          <div className="grid grid-cols-3 lg:contents gap-4 lg:gap-0">
            {/* Company Links */}
            <div className="lg:mb-0">
              <h4 className="text-white font-bold text-sm lg:text-lg mb-3 lg:mb-6">Company</h4>
              <ul className="space-y-1 lg:space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-purple-200 hover:text-white transition-colors duration-300 text-xs lg:text-base"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support Links */}
            <div className="lg:mb-0">
              <h4 className="text-white font-bold text-sm lg:text-lg mb-3 lg:mb-6">Support</h4>
              <ul className="space-y-1 lg:space-y-3">
                {footerLinks.support.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-purple-200 hover:text-white transition-colors duration-300 text-xs lg:text-base"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="text-white font-bold text-sm lg:text-lg mb-3 lg:mb-6">Legal</h4>
              <ul className="space-y-1 lg:space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-purple-200 hover:text-white transition-colors duration-300 text-xs lg:text-base"
                    >
                      {link.name}
                    </a>
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