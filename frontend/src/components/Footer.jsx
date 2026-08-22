import React from "react";
import { Link } from "react-router-dom";
import { EnvelopeIcon, MapPinIcon } from "@heroicons/react/24/outline";

const Footer = () => {
  return (
    <footer className="footer-premium relative mt-auto" role="contentinfo">
      <div className="footer-accent" />

      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="footer-logo-mark">
                <span className="text-white font-bold text-sm font-display">TP</span>
              </div>
              <h3 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                Transcounty
              </h3>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Staff pharmacy operations for branches across Kenya — POS, inventory, prescriptions, and finance.
            </p>
          </div>

          <div>
            <h4 className="footer-heading">Staff access</h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/login" className="footer-link">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="footer-heading">Contact</h4>
            <ul className="space-y-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-center gap-2">
                <EnvelopeIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
                <span>info@transcountypharmacy.co.ke</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
                <span>Nairobi, Kenya</span>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="footer-copyright pt-8 mt-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs"
          style={{ borderTop: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}
        >
          <p>© {new Date().getFullYear()} Transcounty Pharmacy. All rights reserved.</p>
          <p>Licensed under PPB Kenya.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
