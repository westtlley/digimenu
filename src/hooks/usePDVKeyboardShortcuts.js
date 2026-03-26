import React from 'react';

function isTextInputElement(element) {
  if (!element) return false;
  const tagName = element.tagName?.toLowerCase?.();
  return (
    ['input', 'textarea', 'select'].includes(tagName)
    || element.getAttribute?.('contenteditable') === 'true'
    || element.getAttribute?.('role') === 'combobox'
  );
}

function isNeutralKeyboardTarget(element) {
  if (!element || element === document.body || element === document.documentElement) {
    return true;
  }

  const tagName = element.tagName?.toLowerCase?.();
  return !['input', 'textarea', 'select', 'button', 'a'].includes(tagName)
    && element.getAttribute?.('contenteditable') !== 'true';
}

export function usePDVKeyboardShortcuts({
  enabled = true,
  codeInputRef,
  codeInputValue = '',
  isModalOpen = false,
  isCartOverlayOpen = false,
  canToggleCart = true,
  onFocusCode,
  onResetCodeState,
  onOpenPayment,
  onToggleCart,
  onRemoveLastItem,
  onAdjustLastItemQuantity,
  onOpenHelp,
}) {
  const handlersRef = React.useRef({
    onFocusCode,
    onResetCodeState,
    onOpenPayment,
    onToggleCart,
    onRemoveLastItem,
    onAdjustLastItemQuantity,
    onOpenHelp,
  });

  handlersRef.current = {
    onFocusCode,
    onResetCodeState,
    onOpenPayment,
    onToggleCart,
    onRemoveLastItem,
    onAdjustLastItemQuantity,
    onOpenHelp,
  };

  React.useEffect(() => {
    if (!enabled) return undefined;

    const handleKeyDown = (event) => {
      const activeElement = document.activeElement;
      const isCodeInputActive = !!(codeInputRef?.current && activeElement === codeInputRef.current);
      const isTypingInTextInput = isTextInputElement(activeElement);
      const isTypingOutsideCodeInput = isTypingInTextInput && !isCodeInputActive;
      const isNeutralTarget = isNeutralKeyboardTarget(activeElement);

      const openHelp = () => {
        event.preventDefault();
        handlersRef.current.onOpenHelp?.();
      };

      if ((event.key === '?' || event.key === 'F1') && !isTypingInTextInput && !isModalOpen && !isCartOverlayOpen) {
        openHelp();
        return;
      }

      if (event.key === 'F2' && !isTypingInTextInput && !isModalOpen && !isCartOverlayOpen) {
        event.preventDefault();
        handlersRef.current.onFocusCode?.();
        return;
      }

      if (event.key === 'Escape' && !isTypingInTextInput && !isModalOpen && !isCartOverlayOpen && !codeInputValue) {
        event.preventDefault();
        handlersRef.current.onResetCodeState?.();
        return;
      }

      if (event.key === 'F3' && !isTypingInTextInput && canToggleCart && (!isModalOpen || isCartOverlayOpen)) {
        event.preventDefault();
        handlersRef.current.onToggleCart?.();
        return;
      }

      if (isModalOpen || isCartOverlayOpen || isTypingOutsideCodeInput || isCodeInputActive) {
        return;
      }

      if (event.key === 'F4') {
        event.preventDefault();
        handlersRef.current.onOpenPayment?.();
        return;
      }

      if (event.ctrlKey && event.key === 'Backspace') {
        event.preventDefault();
        handlersRef.current.onRemoveLastItem?.();
        return;
      }

      if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key === '+') {
        event.preventDefault();
        handlersRef.current.onAdjustLastItemQuantity?.(1);
        return;
      }

      if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key === '-') {
        event.preventDefault();
        handlersRef.current.onAdjustLastItemQuantity?.(-1);
        return;
      }

      if (event.key === 'Enter' && isNeutralTarget) {
        event.preventDefault();
        handlersRef.current.onOpenPayment?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, codeInputRef, codeInputValue, isModalOpen, isCartOverlayOpen, canToggleCart]);
}
