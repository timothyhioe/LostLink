import './ConfirmDialog.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDarkMode: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDarkMode,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className={`confirm-dialog-overlay ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
      onClick={onCancel}
    >
      <div
        className={`confirm-dialog-container ${isDarkMode ? 'dark-mode' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="confirm-dialog-title">{title}</h2>
        <p className="confirm-dialog-message">{message}</p>

        <div className="confirm-dialog-buttons">
          <button
            className="confirm-dialog-cancel"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className="confirm-dialog-confirm"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
