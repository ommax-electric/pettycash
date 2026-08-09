# Project Memory & Release History

## Version 3 (Current Stable Checkpoint)
- **Status**: Locked & Verified (August 2026)
- **Key Characteristics**:
  - Safe Firestore payload sanitization (`sanitizeForFirestore` wrapper for `setDoc`, `addDoc`, `updateDoc` in `firebase.ts`) ensuring `undefined` properties (such as `editHistory`) do not trigger invalid Firestore document save errors.
  - Correct field isolation between Particulars/Purpose and Remarks across Inward & Outward forms in `RegisterView.tsx`, enabling clean removal/editing of remarks without falling back to particulars.
  - Fully verified build and clean linting status.
- **Restoration Rule**: If requested to "restore Version 3" in future sessions, preserve the `sanitizeForFirestore` database wrappers and the isolated `remarks` form field state handling.

## Version 2
- **Status**: Locked & Verified (August 2026)
- **Key Characteristics**:
  - Cash Voucher & Receipt Voucher printouts optimized for A4 single and batch (3 per A4 page) printing.
  - Void vouchers display a watermarked **VOID** diagonal banner and a **VOUCHER HAS BEEN VOIDED** audit record footer.
  - Void dates & timestamps formatted specifically in **IST (Asia/Kolkata)** timezone as `DD-MM-YYYY | HH:MM AM/PM`.
  - Preserves clean original text under void banners without strikethroughs for optimal legibility.
- **Restoration Rule**: If requested to "restore Version 2" in future sessions, preserve all voucher layouts, IST date formatting helpers (`formatVoidDateTime`), and void watermark styling without alteration.
