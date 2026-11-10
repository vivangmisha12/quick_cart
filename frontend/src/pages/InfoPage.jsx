import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Clock, 
  HelpCircle, 
  FileText, 
  RotateCcw, 
  Phone, 
  Mail, 
  MapPin, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Zap,
  CheckCircle2,
  Lock
} from 'lucide-react';
import '../styles/InfoPage.css';

const INFO_PAGES_DATA = {
  'about-us': {
    title: 'About Progicart',
    subtitle: 'Everything delivered in 10 minutes — grocery shopping reimagined.',
    badge: 'Our Story & Mission',
    icon: Zap,
    updatedAt: 'November 2026',
    sections: [
      {
        heading: '⚡ The 10-Minute Delivery Revolution',
        content: `Progicart is India's pioneer in quick-commerce. We believe that nobody should have to plan their daily groceries hours or days in advance. Whether you ran out of milk while brewing morning chai, need fresh coriander for tonight's dinner, or craving midnight ice cream — Progicart delivers 5,000+ items directly to your doorstep in 10 to 15 minutes.`
      },
      {
        heading: '🏬 How We Make 10-Minute Delivery Possible',
        content: `Our secret lies in our hyper-local network of micro-fulfillment dark stores situated every 2-3 kilometers across every serviced neighborhood. When you place an order, our proprietary automated warehouse system picks and packs your basket within 2 minutes. Our trained delivery fleet is on the road within 3 minutes, navigating hyper-local routes safely to reach your home in under 10 minutes.`
      },
      {
        heading: '🥦 Farm-Fresh & 100% Genuine Quality Guarantee',
        content: `Speed never comes at the cost of quality. We source fresh fruits, vegetables, and greens directly from verified regional farmers every morning at 4:00 AM. Every product goes through temperature-controlled cold chains and dual quality checks before reaching your basket.`
      },
      {
        heading: '🇮🇳 Built With Pride For Modern India',
        content: `Serving millions of households across 30+ cities, Progicart continues to build technology, sustainable packaging, and electric vehicle (EV) fleets that empower local economies while making daily life effortless for urban consumers.`
      }
    ]
  },

  'contact-us': {
    title: 'Contact Customer Support',
    subtitle: 'We are here to help you 7 days a week from 6:00 AM to 12:00 Midnight.',
    badge: '24x7 Customer Assistance',
    icon: Phone,
    updatedAt: 'Live Help Available',
    contactCards: [
      {
        title: 'Customer Helpline',
        value: '+91 1800-208-8888',
        sub: 'Toll-free customer care (6 AM – 12 AM)',
        icon: Phone,
        action: 'tel:18002088888',
        btnText: 'Call Support'
      },
      {
        title: 'Email Assistance',
        value: 'support@progicart.com',
        sub: 'Expect a response within 15 minutes',
        icon: Mail,
        action: 'mailto:support@progicart.com',
        btnText: 'Send Email'
      },
      {
        title: 'Corporate Headquarters',
        value: 'Progicart Technologies Pvt. Ltd.',
        sub: 'Vibhuti Khand, Gomti Nagar, Lucknow, UP - 226010',
        icon: MapPin,
        action: '#',
        btnText: 'Get Directions'
      }
    ],
    sections: [
      {
        heading: '📦 Quick Order Complaints & Missing Items',
        content: `If you have an active order with a missing item, damaged product, or delay, you can immediately report it directly from your Orders page. Our instant automated resolution system will process replacements or wallet refunds within 60 seconds without having to wait in support queues.`
      },
      {
        heading: '🤝 Partner & Business Inquiries',
        content: `For dark store partnerships, vendor onboardings, and brand tie-ups, reach out to partners@progicart.com with your business details and catalogue.`
      }
    ]
  },

  'faqs': {
    title: 'Frequently Asked Questions',
    subtitle: 'Find quick answers to common questions about orders, payments & delivery.',
    badge: 'Help & Knowledge Base',
    icon: HelpCircle,
    updatedAt: 'Updated Daily',
    faqs: [
      {
        q: 'How does Progicart deliver orders in just 10 minutes?',
        a: 'We operate hyper-local dark stores located every 2-3 kilometers in serviced neighborhoods. Each store stocks 5,000+ daily essentials. When you click "Pay", automated batch picking happens in under 2 minutes, and riders take safe 1-2 km routes to arrive at your door in 10 minutes.'
      },
      {
        q: 'Is there a minimum order value for delivery?',
        a: 'There is no minimum order value! You can order a single pack of bread or an entire monthly grocery cart. Orders above ₹499 qualify for completely FREE delivery.'
      },
      {
        q: 'What payment modes are accepted on Progicart?',
        a: 'We accept all secure payment methods: UPI (Google Pay, PhonePe, Paytm, CRED), Credit & Debit Cards (Visa, Mastercard, RuPay), Net Banking, Sodexo/Pluxee meal cards, and Cash on Delivery (COD).'
      },
      {
        q: 'What if I receive a damaged or missing item?',
        a: 'We guarantee 100% satisfaction. Simply open "My Orders", select the item, and tap "Report Issue". You will get an instant replacement or immediate refund to your original payment mode without hassle.'
      },
      {
        q: 'Can I cancel my order once placed?',
        a: 'Because our dark stores begin packing within 60 seconds of order placement, orders can be cancelled within 1 minute of confirmation before the rider departs. After dispatch, you can simply refuse the order at your doorstep for a full refund.'
      },
      {
        q: 'Are your fruits and vegetables fresh?',
        a: 'Yes! All fresh produce is sourced every morning from regional farms and farmer producer organisations (FPOs). They undergo strict sorting and grading before dispatch to ensure zero spoiled items.'
      }
    ]
  },

  'privacy-policy': {
    title: 'Privacy Policy',
    subtitle: 'How Progicart collects, protects, and respects your personal data.',
    badge: 'Your Privacy Matters',
    icon: Lock,
    updatedAt: 'October 2026',
    sections: [
      {
        heading: '1. Information We Collect',
        content: `We collect essential information required to deliver your orders: your name, phone number, email address, delivery addresses, and precise GPS coordinates when location permissions are granted. We never store raw credit/debit card numbers; all payments are processed through RBI-authorized PCI-DSS compliant payment gateways.`
      },
      {
        heading: '2. How We Use Location Data',
        content: `Your GPS location is strictly used to match you with the nearest serviceable dark store, show hyper-local inventory, calculate accurate delivery times (10-15 mins), and guide our delivery partner to your doorstep. We never sell your location or browsing data to third parties.`
      },
      {
        heading: '3. Data Security & Encryption',
        content: `All traffic between your browser and our servers is secured with 256-bit TLS/SSL encryption. User passwords are encrypted using one-way bcrypt hashing algorithms that cannot be reversed even by our internal team.`
      },
      {
        heading: '4. Your Rights & Account Deletion',
        content: `You maintain complete control over your data. You may request address updates, opt-out of marketing communications, or request permanent deletion of your account and order history by contacting privacy@progicart.com.`
      }
    ]
  },

  'terms-and-conditions': {
    title: 'Terms & Conditions',
    subtitle: 'Please review the terms of service governing your use of Progicart.',
    badge: 'User Agreement',
    icon: FileText,
    updatedAt: 'September 2026',
    sections: [
      {
        heading: '1. Platform Usage & Account Terms',
        content: `By registering or placing an order on Progicart, you agree to provide accurate delivery addresses, contact details, and comply with all applicable laws. You are responsible for maintaining the confidentiality of your account password.`
      },
      {
        heading: '2. 10-Minute Delivery Commitment',
        content: `Our 10-minute delivery promise applies to serviceable dark store catchment zones under standard weather and road conditions. During extreme weather events (heavy rain, waterlogging) or peak festival rushes, delivery times may be adjusted for rider safety.`
      },
      {
        heading: '3. Pricing & Product Availability',
        content: `All prices listed are inclusive of applicable taxes (GST). We endeavor to ensure 100% catalog accuracy; in the rare event of sudden out-of-stock items, we notify you immediately and refund the item amount in full.`
      },
      {
        heading: '4. Fair Use & Prohibited Activities',
        content: `Creating multiple accounts to abuse welcome promo codes or engaging in fraudulent chargebacks will result in permanent account suspension across our platform network.`
      }
    ]
  },

  'cancellation-and-refunds': {
    title: 'Cancellation & Refund Policy',
    subtitle: 'Fair, transparent, and instant doorstep return & refund guidelines.',
    badge: '100% Money-Back Guarantee',
    icon: RotateCcw,
    updatedAt: 'November 2026',
    sections: [
      {
        heading: '1. Instant Order Cancellation',
        content: `Orders can be cancelled free of charge within 60 seconds of placement. If cancelled in this window, 100% of the payment is reversed immediately to your original payment mode.`
      },
      {
        heading: '2. Doorstep Return Policy',
        content: `You have the right to inspect items upon delivery. If any product is damaged, near expiry, wrong, or unsatisfactory, you can hand it right back to the delivery partner. The rider marks it returned, and the refund is triggered instantly.`
      },
      {
        heading: '3. Refund Turnaround Timelines',
        content: `• UPI Payments (GPay / PhonePe / Paytm): Instant to 2 hours.\n• Debit & Credit Cards: 2 to 4 business days (depending on your bank).\n• Net Banking: 2 to 3 business days.\n• Wallet / COD: Refunded instantly to your Progicart Wallet.`
      },
      {
        heading: '4. Non-Returnable Items',
        content: `For safety and health reasons, personal hygiene items, innerwear, and unsealed perishable baby food cannot be returned once accepted, unless delivered damaged or expired.`
      }
    ]
  },

  'delivery-info': {
    title: 'Delivery Information & Standards',
    subtitle: 'Everything you need to know about our lightning-fast fulfillment network.',
    badge: 'How Delivery Works',
    icon: Clock,
    updatedAt: 'November 2026',
    sections: [
      {
        heading: '1. Standard 10-15 Minute Delivery',
        content: `Our hyper-local logistics model is built for instant fulfillment. Orders are dispatched from micro dark stores located right inside your neighborhood, ensuring your items spend less time in transit and arrive fresh.`
      },
      {
        heading: '2. Delivery Charges & Free Delivery Thresholds',
        content: `• Orders above ₹499: 100% FREE Delivery.\n• Orders below ₹499: Nominal delivery fee of ₹15 to ₹25 depending on order size and distance.\n• Handling / Rain Fee: A transparent small fee of ₹5-₹15 may apply during extreme monsoon conditions to compensate riders fairly.`
      },
      {
        heading: '3. Contactless Delivery',
        content: `All deliveries can be requested as "Contactless Delivery". Our delivery partner will place your package safely at your door, ring the bell, and step back 2 meters.`
      }
    ]
  }
};

const SIDEBAR_NAV_ITEMS = [
  { slug: 'about-us', label: 'About Progicart' },
  { slug: 'contact-us', label: 'Contact Support' },
  { slug: 'faqs', label: 'FAQs & Help' },
  { slug: 'privacy-policy', label: 'Privacy Policy' },
  { slug: 'terms-and-conditions', label: 'Terms & Conditions' },
  { slug: 'cancellation-and-refunds', label: 'Cancellation & Refunds' },
  { slug: 'delivery-info', label: 'Delivery Information' },
];

const InfoPage = () => {
  const { slug } = useParams();
  const currentSlug = slug || 'about-us';
  const pageData = INFO_PAGES_DATA[currentSlug] || INFO_PAGES_DATA['about-us'];

  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const toggleFaq = (idx) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  const IconComponent = pageData.icon || FileText;

  return (
    <div className="info-page-container">
      {/* Top Breadcrumb & Hero Banner */}
      <div className="info-hero-banner">
        <div className="info-hero-content">
          <nav className="info-breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <ChevronRight size={14} />
            <Link to="/info/about-us">Information</Link>
            <ChevronRight size={14} />
            <span>{pageData.title}</span>
          </nav>

          <div className="info-badge-row">
            <span className="info-pill-badge">{pageData.badge}</span>
            <span className="info-updated-pill">Last Updated: {pageData.updatedAt}</span>
          </div>

          <h1 className="info-main-title">{pageData.title}</h1>
          <p className="info-sub-title">{pageData.subtitle}</p>
        </div>
      </div>

      {/* Main Content Layout with Sticky Left Sidebar */}
      <div className="info-body-grid">
        {/* Left Sticky Navigation Sidebar */}
        <aside className="info-sidebar">
          <div className="sidebar-sticky-card">
            <h4>Quick Navigation</h4>
            <nav className="sidebar-links-list">
              {SIDEBAR_NAV_ITEMS.map((item) => {
                const isActive = item.slug === currentSlug;
                return (
                  <Link
                    key={item.slug}
                    to={`/info/${item.slug}`}
                    className={`sidebar-link-btn ${isActive ? 'is-active' : ''}`}
                  >
                    <span>{item.label}</span>
                    <ChevronRight size={15} className="arrow-icon" />
                  </Link>
                );
              })}
            </nav>

            <div className="sidebar-support-widget">
              <div className="support-widget-title">
                <Sparkles size={16} color="#0c831f" />
                <span>Need immediate help?</span>
              </div>
              <p>Our 24x7 customer support team is available round the clock.</p>
              <Link to="/info/contact-us" className="support-widget-btn">
                Contact Care
              </Link>
            </div>
          </div>
        </aside>

        {/* Right Dynamic Content Pane */}
        <main className="info-content-pane">
          {/* Contact Cards if Contact Us */}
          {pageData.contactCards && (
            <div className="contact-cards-grid">
              {pageData.contactCards.map((c, i) => {
                const CardIcon = c.icon;
                return (
                  <div key={i} className="contact-feature-card">
                    <div className="contact-icon-bubble">
                      <CardIcon size={22} />
                    </div>
                    <div className="contact-card-info">
                      <h3>{c.title}</h3>
                      <strong>{c.value}</strong>
                      <p>{c.sub}</p>
                      {c.action !== '#' ? (
                        <a href={c.action} className="contact-card-btn">
                          {c.btnText}
                        </a>
                      ) : (
                        <span className="contact-tag-badge">{c.btnText}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Interactive FAQs Accordion if FAQs */}
          {pageData.faqs && (
            <div className="faqs-accordion-wrapper">
              <div className="faqs-list">
                {pageData.faqs.map((faq, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div key={index} className={`faq-item-card ${isOpen ? 'open' : ''}`}>
                      <button 
                        type="button" 
                        className="faq-question-btn" 
                        onClick={() => toggleFaq(index)}
                      >
                        <span className="faq-q-text">{faq.q}</span>
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      {isOpen && (
                        <div className="faq-answer-box">
                          <p>{faq.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Structured Text Sections */}
          {pageData.sections && (
            <div className="info-sections-flow">
              {pageData.sections.map((sec, idx) => (
                <div key={idx} className="info-content-card">
                  <h2 className="info-card-heading">{sec.heading}</h2>
                  <div className="info-card-text">
                    {sec.content.split('\n').map((line, pIdx) => (
                      <p key={pIdx}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Trust Highlights Strip at Bottom of Every Info Page */}
          <div className="info-trust-footer-strip">
            <div className="trust-cell">
              <ShieldCheck size={20} color="#0c831f" />
              <span>100% Genuine Products</span>
            </div>
            <div className="trust-cell">
              <Zap size={20} color="#0c831f" />
              <span>Lightning 10-Min Delivery</span>
            </div>
            <div className="trust-cell">
              <CheckCircle2 size={20} color="#0c831f" />
              <span>Easy Doorstep Returns</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default InfoPage;

