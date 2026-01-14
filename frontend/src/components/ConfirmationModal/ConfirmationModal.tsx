import React from 'react';
import './ConfirmationModal.css';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isDarkMode?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmationModal({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  isDarkMode = false,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationModalProps) {
  return (
    <div className={`confirmation-modal-overlay ${isDarkMode ? 'dark-mode' : ''}`}>
      <div className={`confirmation-modal ${isDarkMode ? 'dark-mode' : ''}`}>
        <div className="confirmation-modal-header">
          <h3>{title}</h3>
        </div>

        <div className="confirmation-modal-content">
          <p>{message}</p>
        </div>

        <div className="confirmation-modal-footer">
          <button
            className="confirmation-modal-cancel-button"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`confirmation-modal-confirm-button ${isDangerous ? 'dangerous' : ''}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Confirming...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
