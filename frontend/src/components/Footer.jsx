import React from "react";
import { Link } from "react-router-dom";
import { EnvelopeIcon, PhoneIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from "react-icons/fa";

const Footer = () => {
  const quickLinks = [
    { to: "/", label: "Home" },
    { to: "/products", label: "Products" },
  ];

  return (
    <footer className="footer-premium relative mt-auto" role="contentinfo">
      <div className="footer-accent" />

      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="footer-logo-mark">
                <span className="text-white font-bold text-sm font-display">TP</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 font-display">Transcounty</h3>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Your trusted pharmacy management platform in Kenya. Secure, convenient, and accessible healthcare.
            </p>
          </div>

          <div>
            <h4 className="footer-heading">Quick Links</h4>
            <ul className="space-y-2.5">
              {quickLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="footer-link">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="footer-heading">Contact Us</h4>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li className="flex items-center gap-2">
                <EnvelopeIcon className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <span>info@transcountypharmacy.co.ke</span>
              </li>
              <li className="flex items-center gap-2">
                <PhoneIcon className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <span>+254 700 123 456</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <span>Nairobi, Kenya</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="footer-heading">Follow Us</h4>
            <div className="flex items-center gap-3">
              {[
                { href: "https://facebook.com", Icon: FaFacebook, label: "Facebook" },
                { href: "https://twitter.com", Icon: FaTwitter, label: "Twitter" },
                { href: "https://instagram.com", Icon: FaInstagram, label: "Instagram" },
                { href: "https://linkedin.com", Icon: FaLinkedin, label: "LinkedIn" },
              ].map(({ href, Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="footer-social-btn"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="footer-copyright border-t border-slate-200/60 pt-8 mt-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>© 2025 Transcounty Pharmacy. All rights reserved.</p>
          <p>Licensed under PPB Kenya.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
