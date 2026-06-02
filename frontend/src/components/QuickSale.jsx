import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon as XIcon } from '@heroicons/react/24/outline';
import OTCSalePanel from './OTCSalePanel';

const QuickSale = ({ isOpen, onClose }) => (
  <Transition appear show={isOpen} as={Fragment}>
    <Dialog as="div" className="relative z-50" onClose={onClose}>
      <Transition.Child
        as={Fragment}
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 modal-overlay" />
      </Transition.Child>

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-[2.5rem] modal-card p-8 transition-all">
              <div className="flex justify-between items-center mb-6">
                <Dialog.Title className="text-2xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                  Quick Sale
                </Dialog.Title>
                <button type="button" onClick={onClose} className="p-2 rounded-xl form-cancel-btn" aria-label="Close">
                  <XIcon className="h-6 w-6" />
                </button>
              </div>
              <OTCSalePanel />
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </div>
    </Dialog>
  </Transition>
);

export default QuickSale;
