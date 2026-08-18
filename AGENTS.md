# Project Memory & Release History

## Version: Petty (Current Stable Checkpoint)
- **Status**: Locked & Verified (August 2026)
- **Key Characteristics**:
  - **Admin Settings Sidebar Dropdown**: Expandable/collapsible sub-menu under the main Admin Settings navigation (defaults to collapsed/closed; opens smoothly on click) containing App Settings, Users, Integrations, Templates, Audit Trail, and System Ops.
  - **Full-Width Viewport**: Clean layout with no inner secondary sidebar inside the Admin Settings view.
  - **Spacious Sub-Tabs**: High-legibility, non-truncated sub-tab headers across both App Settings (Petty Cash Settings, CRM Settings, HRMS Settings) and Templates (Petty Cash Templates [9 Active], CRM Templates, HRMS Templates).
  - **Email & Notification Templates**: Full suite of 9 corporate HTML email templates with dynamic variable tag injection, live rendered card preview frames, and corporate defaults reset.
  - **Safe Firestore Sanitization**: `sanitizeForFirestore` wrappers in `firebase.ts` preventing `undefined` values from breaking document operations.
  - **Field Isolation**: Clean separation between Particulars/Purpose and Remarks across Inward & Outward forms.
  - **Vouchers & Printouts**: Single & 3-per-page A4 batch printing for Cash/Receipt vouchers with IST timestamp formatting and VOID watermarks.
- **Restoration Rule**: If requested to "restore Petty" or "restore Petty backup", restore this exact state including the collapsible Admin Settings sidebar navigation, the spacious template and app settings sub-tabs, 9 active email templates, and all verified voucher print and database sanitization logic.

## Version 3
- **Status**: Verified (August 2026)
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
