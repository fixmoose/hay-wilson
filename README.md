# Hay & Wilson Electric Company LLC Website

A modern, professional static website for Hay & Wilson Electric Company LLC, showcasing electrical contracting services.

## Features

- **Modern Design**: Clean, professional design with a blue and gold color scheme
- **Responsive Layout**: Fully responsive design that works on all devices (desktop, tablet, mobile)
- **Service Categories**: Clear overview of all services including:
  - Commercial Electrical
  - Residential Electrical
  - Data Centers
  - Battery Backup Systems
  - Solar PV Systems
  - SPD Protection
  - Main Panels & Distribution
  - LLM & AI Infrastructure
- **Interactive Navigation**: Smooth scrolling and active link highlighting
- **Contact Form**: User-friendly contact form for inquiries
- **Professional Branding**: Integrated company logo and consistent branding

## Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with flexbox and grid
- **Vanilla JavaScript**: No dependencies, lightweight and fast
- **Google Fonts**: Inter font family for clean typography

## File Structure

```
HandW Website/
├── index.html          # Main HTML file
├── styles.css          # All CSS styling
├── script.js           # JavaScript for interactivity
├── assets/             # Logo and images
│   ├── logo-transparent-svg.svg
│   ├── logo-transparent-png.png
│   └── ...
└── README.md          # This file
```

## How to Use

### Option 1: Open Locally
1. Simply open `index.html` in any modern web browser
2. No server required - it's a static site!

### Option 2: Use a Local Server (Recommended for Testing)
```bash
# Using Python 3
python -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js (if you have npx)
npx serve

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

## Deployment Options

### Deploy to GitHub Pages
1. Create a GitHub repository
2. Push these files to the repository
3. Go to Settings > Pages
4. Select the main branch as the source
5. Your site will be live at `https://yourusername.github.io/repository-name`

### Deploy to Netlify
1. Sign up at [netlify.com](https://netlify.com)
2. Drag and drop the entire folder
3. Your site will be live instantly with a free subdomain
4. Optional: Connect a custom domain

### Deploy to Vercel
1. Sign up at [vercel.com](https://vercel.com)
2. Install Vercel CLI: `npm i -g vercel`
3. Run `vercel` in the project directory
4. Follow the prompts

### Deploy to AWS S3 + CloudFront
1. Create an S3 bucket
2. Enable static website hosting
3. Upload all files
4. Set up CloudFront distribution (optional, for SSL)

## Customization

### Update Contact Information
Edit [index.html](index.html) and update:
- Phone number (search for `tel:`)
- Email address (search for `mailto:`)
- Business hours

### Change Colors
Edit [styles.css](styles.css) and modify the CSS variables at the top:
```css
:root {
    --primary-color: #1e3a8a;      /* Main blue color */
    --accent-color: #f59e0b;        /* Gold accent */
    /* ... other colors ... */
}
```

### Add More Services
Edit [index.html](index.html) and add more service cards in the services grid section.

### Connect Contact Form
The contact form currently shows an alert. To make it functional:
1. Use a service like [Formspree](https://formspree.io)
2. Use [EmailJS](https://www.emailjs.com/)
3. Connect to your own backend API
4. Use serverless functions (AWS Lambda, Netlify Functions, etc.)

Example with Formspree:
```html
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Lightweight: No heavy frameworks
- Fast loading: Minimal dependencies
- Optimized images: Use SVG logo when possible
- Smooth animations: CSS transitions with GPU acceleration

## Future Enhancements

Consider adding:
- Image gallery of completed projects
- Customer testimonials
- Service area map
- Blog section
- Online quote calculator
- Live chat integration
- Google Analytics

## License

Copyright © 2025 Hay & Wilson Electric Company LLC. All rights reserved.

## Support

For website issues or questions, contact your web developer.
For business inquiries, use the contact form on the website.
