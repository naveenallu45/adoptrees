# 🌳 Adoptrees

A modern, animated web application built with Next.js, TypeScript, Tailwind CSS, and Framer Motion.

## ✨ Features

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and interactions
- **Modern UI** - Beautiful gradient backgrounds and glassmorphism effects
- **Responsive Design** - Works on all devices
- **Interactive Elements** - Hover effects and animated components

## 🚀 Getting Started

### Prerequisits

- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd Adoptrees
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Development**: ESLint for code quality

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # Reusable components
│   └── Home/           # Home page components
│       ├── Navbar.tsx      # Navigation component
│       ├── HeroSection.tsx # Hero/landing section
│       ├── HowItWorks.tsx  # Process explanation
│       └── Footer.tsx      # Footer component
└── types/              # TypeScript type definitions
    └── index.ts
```

## 🎨 Components

### Navbar
Fixed navigation bar with responsive mobile menu, smooth animations, and gradient CTA button.

### HeroSection
Eye-catching landing section with animated title, call-to-action buttons, and impact statistics.

### HowItWorks
Step-by-step process explanation with animated cards and connecting lines showing the tree adoption journey.

### Footer
Comprehensive footer with links, newsletter signup, social media, and environmental impact statistics.

## 🔧 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🎯 Customization

### Colors
Modify the color scheme in `tailwind.config.js` or use Tailwind's built-in color palette.

### Animations
Customize animations in components using Framer Motion's powerful API.

### Layout
Edit `src/app/layout.tsx` for global layout changes.

## 📱 Responsive Design

The application is fully responsive with:
- Mobile-first approach
- Flexible grid layouts
- Adaptive typography
- Touch-friendly interactions

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Deploy with zero configuration

### Other Platforms
The app can be deployed to any platform that supports Node.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) team for the amazing framework
- [Framer Motion](https://framer.com/motion) for smooth animations
- [Tailwind CSS](https://tailwindcss.com) for utility-first styling
