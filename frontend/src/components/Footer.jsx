import React from "react";
import {
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">TP</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Transcounty Pharmacy
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              Your trusted online pharmacy in Kenya. Secure, convenient, and
              accessible healthcare at your fingertips.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/"
                  className="text-gray-500 hover:text-blue-600 text-sm"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/products"
                  className="text-gray-500 hover:text-blue-600 text-sm"
                >
                  Products
                </a>
              </li>
              <li>
                <a
                  href="/orders"
                  className="text-gray-500 hover:text-blue-600 text-sm"
                >
                  My Orders
                </a>
              </li>
              <li>
                <a
                  href="/prescriptions"
                  className="text-gray-500 hover:text-blue-600 text-sm"
                >
                  Prescriptions
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              Contact Us
            </h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center space-x-2">
                <EnvelopeIcon className="w-4 h-4" />
                <span>info@transcountyppharmacy.co.ke</span>
              </li>
              <li className="flex items-center space-x-2">
                <PhoneIcon className="w-4 h-4" />
                <span>+254 700 123 456</span>
              </li>
              <li className="flex items-center space-x-2">
                <MapPinIcon className="w-4 h-4" />
                <span>Nairobi, Kenya</span>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              Follow Us
            </h4>
            <div className="flex items-center space-x-4">
              <a
                href="https://facebook.com/transcountyppharmacy"
                className="text-gray-500 hover:text-blue-600"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <FaFacebook className="w-6 h-6" />
              </a>
              <a
                href="https://twitter.com/transcountyppharmacy"
                className="text-gray-500 hover:text-sky-500"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
              >
                <FaTwitter className="w-6 h-6" />
              </a>
              <a
                href="https://instagram.com/transcountyppharmacy"
                className="text-gray-500 hover:text-pink-600"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <FaInstagram className="w-6 h-6" />
              </a>
              <a
                href="https://linkedin.com/company/transcountyppharmacy"
                className="text-gray-500 hover:text-blue-700"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
              >
                <FaLinkedin className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-200 pt-8 mt-8 text-center text-sm text-gray-500">
          <p>
            &copy; 2025 Transcounty Pharmacy. All rights reserved. | Licensed
            under PPB Kenya.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
