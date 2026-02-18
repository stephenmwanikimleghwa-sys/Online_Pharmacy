import React from "react";
import { EnvelopeIcon, PhoneIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="relative mt-auto border-t border-white/60"
      style={{ background: "linear-gradient(135deg, #eef2ff 0%, #faf5ff 50%, #ecfdf5 100%)" }}>
      {/* Top accent line */}
      <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #4f46e5, #7c3aed, #c026d3)" }} />

      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-glow-sm"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                <span className="text-white font-bold text-sm font-display">TP</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 font-display">Transcounty</h3>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Your trusted pharmacy management platform in Kenya. Secure, convenient, and accessible healthcare.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { href: "/", label: "Home" },
                { href: "/products", label: "Products" },
                { href: "/pharmacies", label: "Pharmacies" },
                { href: "/prescriptions", label: "Prescriptions" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <a href={href} className="text-slate-500 hover:text-primary-600 text-sm transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Contact Us</h4>
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

          {/* Social Media */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Follow Us</h4>
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
                  className="w-9 h-9 rounded-xl bg-white/80 border border-white/60 flex items-center justify-center text-slate-400 hover:text-primary-600 hover:border-primary-200 hover:shadow-glow-sm transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-slate-200/60 pt-8 mt-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>© 2025 Transcounty Pharmacy. All rights reserved.</p>
          <p>Licensed under PPB Kenya.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
