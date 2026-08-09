# Project Memory & Release History

## Version 2 (Current Stable Checkpoint)
- **Status**: Locked & Verified (August 2026)
- **Key Characteristics**:
  - Cash Voucher & Receipt Voucher printouts optimized for A4 single and batch (3 per A4 page) printing.
  - Void vouchers display a watermarked **VOID** diagonal banner and a **VOUCHER HAS BEEN VOIDED** audit record footer.
  - Void dates & timestamps formatted specifically in **IST (Asia/Kolkata)** timezone as `DD-MM-YYYY | HH:MM AM/PM`.
  - Preserves clean original text under void banners without strikethroughs for optimal legibility.
- **Restoration Rule**: If requested to "restore Version 2" in future sessions, preserve all voucher layouts, IST date formatting helpers (`formatVoidDateTime`), and void watermark styling without alteration.
