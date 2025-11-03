//
// PUBLIC_INTERFACE
// sign-in-11-235.js
// Minimal interaction logic for the Sign In screen.
// This file is intentionally lightweight and only wires basic UI behavior for the static screen.
//
document.addEventListener('DOMContentLoaded', () => {
  // Attach click to Sign In button for demo logging
  const signInBtn = document.querySelector('.big-button');
  if (signInBtn) {
    signInBtn.addEventListener('click', () => {
      // Placeholder handler - integrate with app auth later
      console.log('Sign In clicked');
    });
  }

  // Optional: Toggle focus styles for placeholders to mimic inputs in a static screen
  const inputFields = document.querySelectorAll('.input-field');
  inputFields.forEach((field) => {
    const bg = field.querySelector('.input-bg');
    if (bg) {
      const on = () => bg.style.boxShadow = '0 0 0 2px rgba(18,149,117,0.2)';
      const off = () => bg.style.boxShadow = 'none';
      field.addEventListener('mouseenter', on);
      field.addEventListener('mouseleave', off);
      field.addEventListener('focusin', on);
      field.addEventListener('focusout', off);
    }
  });
});
