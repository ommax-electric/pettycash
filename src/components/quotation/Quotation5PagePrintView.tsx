import React from 'react';
import { 
  SolarQuotation, 
  SolarBenefitRow, 
  DEFAULT_SAVINGS_BENEFITS,
  renderFormattedText,
  interpolateOpeningText,
  interpolateSubject
} from '../../quotation/types';
import { Printer, Download, X, ZoomIn, ZoomOut, CheckCircle2, ShieldCheck, Phone, Mail, Globe, MapPin, QrCode, Edit3, Save, Send, ArrowLeft } from 'lucide-react';
import { formatDateToDMY } from '../../types';

interface Quotation5PagePrintViewProps {
  quotation: SolarQuotation;
  onClose?: () => void;
  onPrint?: () => void;
  onEdit?: (quotation: SolarQuotation) => void;
  onSaveDraft?: (quotation: SolarQuotation) => void;
  onSubmitQuotation?: (quotation: SolarQuotation) => void;
}

// Helper function to get live Stamp/Signature configuration fallback from Tools configuration
function getToolsStampConfig(): { width: number; rotate: number; opacity: number } {
  try {
    const raw = localStorage.getItem('ommax_solar_quotation_master_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        width: typeof parsed.companyStampWidth === 'number' ? parsed.companyStampWidth : 120,
        rotate: typeof parsed.companyStampRotate === 'number' ? parsed.companyStampRotate : 0,
        opacity: typeof parsed.companyStampOpacity === 'number' ? parsed.companyStampOpacity : 0.95
      };
    }
  } catch (e) {
    // fallback
  }
  return { width: 120, rotate: 0, opacity: 0.95 };
}

// Helper function to get live Intro Opening Text from Tools configuration
function getToolsIntroText(): string {
  try {
    const raw = localStorage.getItem('ommax_solar_quotation_master_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.introOpeningText && typeof parsed.introOpeningText === 'string') {
        return parsed.introOpeningText;
      }
    }
  } catch (e) {
    // fallback
  }
  return '';
}

// Helper function to get live Subsidy Note from Tools configuration
function getToolsSubsidyNote(): string {
  try {
    const raw = localStorage.getItem('ommax_solar_quotation_master_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.defaultSubsidyNote && typeof parsed.defaultSubsidyNote === 'string') {
        return parsed.defaultSubsidyNote;
      }
    }
  } catch (e) {
    // fallback
  }
  return 'Direct DBT Subsidy up to ₹78,000 under PM Surya Ghar Muft Bijli Yojana will be credited directly to consumer bank account after DISCOM meter installation.';
}

// Helper function to get live Estimated Solar Benefits matrix from Tools configuration
function getToolsBenefitsTable(): SolarBenefitRow[] {
  try {
    const raw = localStorage.getItem('ommax_solar_quotation_master_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.benefitsTable && Array.isArray(parsed.benefitsTable) && parsed.benefitsTable.length > 0) {
        return parsed.benefitsTable;
      }
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_SAVINGS_BENEFITS;
}

// Helper function to format site location as City - PIN Code (e.g. Ariyalur - 621704)
function formatSiteLocation(location?: string): string {
  if (!location) return 'Ariyalur - 621704';
  const trimmed = location.trim();

  // Extract 6-digit Indian PIN code if present
  const pinMatch = trimmed.match(/\b\d{6}\b/);
  const pinCode = pinMatch ? pinMatch[0] : '';

  // Split lines / commas to find city
  const rawParts = trimmed.split(/[\n,]+/).map(p => p.trim()).filter(Boolean);
  
  // Clean parts by removing pin code, state name (Tamil Nadu, TN, India), and dashes
  const cleanedParts = rawParts.map(part => {
    return part
      .replace(/\b\d{6}\b/g, '')
      .replace(/Tamil\s*Nadu|TN|India/gi, '')
      .replace(/[-–—]/g, '')
      .trim();
  }).filter(Boolean);

  let city = '';
  if (cleanedParts.length > 0) {
    city = cleanedParts[cleanedParts.length - 1];
  } else if (rawParts.length > 0) {
    city = rawParts[0].replace(/\b\d{6}\b/g, '').replace(/[-–—]/g, '').trim();
  }

  if (city && pinCode) {
    return `${city} - ${pinCode}`;
  } else if (city) {
    return city;
  }
  return trimmed;
}

export default function Quotation5PagePrintView({
  quotation,
  onClose,
  onPrint,
  onEdit,
  onSaveDraft,
  onSubmitQuotation
}: Quotation5PagePrintViewProps) {
  const [zoomLevel, setZoomLevel] = React.useState<number>(100);
  const [showSubmitModal, setShowSubmitModal] = React.useState<boolean>(false);
  const pagesContainerRef = React.useRef<HTMLDivElement>(null);

  const handleNativePrint = React.useCallback(() => {
    if (onPrint) {
      onPrint();
      return;
    }

    const prevZoom = zoomLevel;
    if (prevZoom !== 100) {
      setZoomLevel(100);
    }

    // Direct window.print() ensures full browser stylesheet integration and identical behavior to Ctrl+P
    setTimeout(() => {
      window.print();
      if (prevZoom !== 100) {
        setTimeout(() => setZoomLevel(prevZoom), 300);
      }
    }, 150);
  }, [onPrint, zoomLevel]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleNativePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNativePrint]);

  const handleConfirmSubmit = () => {
    setShowSubmitModal(true);
  };

  const siteLocationFormatted = formatSiteLocation(quotation.location);
  const displayBenefits = getToolsBenefitsTable();
  const toolsStampConfig = getToolsStampConfig();

  const stampWidth = quotation.companyStampWidth || toolsStampConfig.width || 120;
  const stampRotate = quotation.companyStampRotate ?? toolsStampConfig.rotate ?? 0;
  const stampOpacity = quotation.companyStampOpacity ?? toolsStampConfig.opacity ?? 0.95;

  const letterhead = quotation.letterhead;

  // Derive dynamic segment text
  const segmentPlace = (() => {
    const seg = (quotation.targetSegment || '').toLowerCase();
    if (seg.includes('industry') || seg.includes('commercial') || seg.includes('factory')) {
      return 'your industry';
    }
    if (seg.includes('institution') || seg.includes('college') || seg.includes('school') || seg.includes('hospital')) {
      return 'your institution';
    }
    if (seg.includes('agri') || seg.includes('farm')) {
      return 'your farm';
    }
    return 'your residence';
  })();

  // Render official Corporate Header (used on each page or when image URL is provided)
  const renderHeader = (pageNumber: number) => {
    if (letterhead?.headerImageUrl) {
      return (
        <div 
          className="w-full relative overflow-hidden transition-all"
          style={{
            height: `${letterhead.headerHeight || 80}px`,
            transform: `scale(${letterhead.headerScale || 1.0}) translate(${letterhead.headerOffsetX || 0}px, ${letterhead.headerOffsetY || 0}px)`,
            transformOrigin: 'top center'
          }}
        >
          <img 
            src={letterhead.headerImageUrl} 
            alt="Corporate Letterhead Header" 
            className="w-full h-full object-contain"
            crossOrigin="anonymous"
          />
        </div>
      );
    }

    // Default High-Precision Ommax Vector Header matching the sample PDF
    return (
      <div className="w-full border-b-2 border-slate-900/10 pb-3 mb-4 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-950 flex items-center font-sans">
              <span className="text-[#ec003f] tracking-tighter">O</span>
              <span className="text-slate-900 tracking-tight">MMAX</span>
            </span>
          </div>
          <span className="text-[13px] font-black tracking-[0.25em] text-[#ec003f] uppercase -mt-1 font-sans">
            ELECTRIC
          </span>
          <span className="text-[9px] font-semibold text-slate-500 tracking-wider mt-0.5">
            An ISO 9001:2015 Certified
          </span>
        </div>

        <div className="text-right flex flex-col items-end gap-0.5 text-slate-700">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <span>+91 94876 43434</span>
            <div className="w-4 h-4 bg-slate-900 rounded-sm flex items-center justify-center text-white text-[9px]">
              <Phone className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="text-[10px] text-slate-600 font-medium flex items-center gap-1">
            <span>www.ommaxelectric.com</span>
          </div>
          <div className="text-[10px] text-slate-600 font-medium flex items-center gap-1">
            <span>info@ommaxelectric.com</span>
            <div className="w-3.5 h-3.5 bg-[#f7b944] rounded-sm flex items-center justify-center text-slate-950 text-[8px] font-bold">
              @
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render official Corporate Footer (used on each page)
  const renderFooter = (pageNumber: number) => {
    if (letterhead?.footerImageUrl) {
      return (
        <div 
          className="w-full mt-auto relative overflow-hidden transition-all pt-2"
          style={{
            height: `${letterhead.footerHeight || 70}px`,
            transform: `scale(${letterhead.footerScale || 1.0}) translate(${letterhead.footerOffsetX || 0}px, ${letterhead.footerOffsetY || 0}px)`,
            transformOrigin: 'bottom center'
          }}
        >
          <img 
            src={letterhead.footerImageUrl} 
            alt="Corporate Letterhead Footer" 
            className="w-full h-full object-contain"
            crossOrigin="anonymous"
          />
        </div>
      );
    }

    // Default High-Precision Ommax Vector Footer matching sample PDF
    return (
      <div className="w-full mt-auto pt-3 border-t border-slate-200/80 flex items-center justify-between text-slate-700 font-sans">
        {/* Stylized QR placeholder block matching the PDF */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-slate-900 p-1 rounded-sm flex items-center justify-center text-[#f7b944] shrink-0 border border-slate-800 shadow-2xs">
            <QrCode className="w-8 h-8" />
          </div>
          <div className="h-8 w-12 bg-gradient-to-r from-[#f7b944] to-[#ec003f] rounded-xs opacity-90"></div>
        </div>

        {/* Corporate Address & CIN matching exact sample */}
        <div className="text-right text-[9.5px] leading-tight text-slate-700 pr-1 flex flex-col items-end">
          <div className="font-extrabold text-slate-900 tracking-wide">
            OMMAX ELECTRIC PRIVATE LIMITED | CIN NO : U51909TN2021PTC144179
          </div>
          <div className="text-slate-600 font-medium mt-0.5 flex items-center gap-1">
            <span className="text-[#ec003f] font-bold">📍</span>
            <span>Corp. off: #12, 2nd Floor, Ganapathinayagar Street, Poothapedu, Porur, Chennai - 116</span>
          </div>
        </div>
      </div>
    );
  };

  const formattedDate = formatDateToDMY(quotation.date);
  const formattedValidityDate = formatDateToDMY(quotation.priceValidityDate);

  return (
    <div className="quotation-5page-root fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-sm overflow-hidden animate-fadeIn print:static print:inset-auto print:z-auto print:overflow-visible print:bg-white print:backdrop-blur-none print:h-auto print:w-auto">
      {/* Global Print Style for pristine 5-page PDF export */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body, #root {
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            background: #ffffff !important;
          }
          /* Hide all sibling elements and background app content during print */
          body > *:not(#root),
          #root > *:not(.fixed) {
            /* Keep only root open */
          }
          header, nav, aside, [role="navigation"], .print\\:hidden {
            display: none !important;
          }
          /* Hide everything in #root except this print modal overlay */
          body * {
            visibility: hidden;
          }
          .quotation-5page-root,
          .quotation-5page-root * {
            visibility: visible;
          }
          .quotation-5page-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            z-index: 999999 !important;
          }
          .quotation-5page-canvas {
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            display: block !important;
            width: 100% !important;
          }
          .a4-page {
            width: 210mm !important;
            min-height: 297mm !important;
            height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 auto !important;
            padding: 15mm !important;
            box-shadow: none !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

      {/* Top Floating Control Bar (Hidden on Print) */}
      <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between border-b border-slate-800 shrink-0 print:hidden shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#f7b944] text-slate-950 font-black flex items-center justify-center shadow-sm">
            5P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white tracking-wide">
                {quotation.offerNo} <span className="text-[#f7b944]">({quotation.revisionCode})</span>
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                Official Letterhead A4
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {quotation.projectName} • {quotation.capacityKw} kWp Solar PV Power Plant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Back to Edit Button */}
          {onEdit && (
            <button
              onClick={() => onEdit(quotation)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-2 rounded-xl text-xs transition-all border border-slate-700 cursor-pointer"
              title="Edit parameters in the questionnaire wizard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Edit</span>
            </button>
          )}

          {/* Save Draft Button */}
          {onSaveDraft && quotation.status !== 'SENT' && (
            <button
              onClick={() => onSaveDraft(quotation)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-2 rounded-xl text-xs transition-all border border-slate-700 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-blue-400" />
              <span>Save Draft</span>
            </button>
          )}

          {/* Submit Proposal Button */}
          {onSubmitQuotation && (
            <button
              onClick={handleConfirmSubmit}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-md cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit</span>
            </button>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 10, 50))}
              className="p-1.5 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono px-2 text-slate-300 min-w-[50px] text-center font-bold">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 10, 150))}
              className="p-1.5 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleNativePrint}
            className="flex items-center gap-2 bg-[#f7b944] hover:bg-amber-400 text-slate-950 font-extrabold px-4 py-2 rounded-xl text-xs transition-all shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors ml-1 cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Paginated Scrollable Canvas */}
      <div className="quotation-5page-canvas flex-1 overflow-y-auto p-6 md:p-10 flex justify-center bg-slate-950/80 print:p-0 print:m-0 print:overflow-visible print:bg-white print:block">
        <div 
          ref={pagesContainerRef}
          id="quotation-5page-container"
          className="flex flex-col items-center gap-10 transition-transform origin-top pb-16 print:p-0 print:m-0 print:gap-0 print:block print:w-full"
          style={{ transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined }}
        >

          {/* ========================================================================= */}
          {/* PAGE 1: EXECUTIVE PROPOSAL & SCOPE OF WORK                                */}
          {/* ========================================================================= */}
          <div className="a4-page w-[210mm] min-h-[297mm] h-[297mm] bg-white text-slate-900 p-[15mm] shadow-2xl rounded-sm flex flex-col justify-between relative overflow-hidden print:shadow-none print:m-0 print:p-[15mm] print:break-after-page">
            <div className="flex flex-col">
              {renderHeader(1)}

              {/* Title */}
              <div className="text-center my-3.5">
                <h1 className="text-sm font-black tracking-widest text-slate-800 uppercase">
                  QUOTATION
                </h1>
              </div>

              {/* 2-Column Metadata Grid */}
              <div className="grid grid-cols-[52%_48%] gap-x-3 gap-y-2 text-xs border border-slate-300 bg-slate-50/60 p-3 rounded-sm mb-6 font-sans">
                <div className="grid grid-cols-[95px_10px_1fr] items-baseline">
                  <span className="font-bold text-slate-700">Project Name</span>
                  <span className="text-slate-500 font-bold">:</span>
                  <span className="font-semibold text-slate-900 truncate">{quotation.projectName}</span>
                </div>
                <div className="grid grid-cols-[100px_10px_1fr] items-baseline">
                  <span className="font-bold text-slate-700">Date</span>
                  <span className="text-slate-500 font-bold">:</span>
                  <span className="font-semibold text-slate-900">{formattedDate}</span>
                </div>
                <div className="grid grid-cols-[95px_10px_1fr] items-baseline">
                  <span className="font-bold text-slate-700">Location</span>
                  <span className="text-slate-500 font-bold">:</span>
                  <span className="font-semibold text-slate-900">{siteLocationFormatted}</span>
                </div>
                <div className="grid grid-cols-[100px_10px_1fr] items-baseline">
                  <span className="font-bold text-slate-700">Offer No.</span>
                  <span className="text-slate-500 font-bold">:</span>
                  <span className="font-black text-slate-950">{quotation.offerNo}</span>
                </div>
                <div className="grid grid-cols-[95px_10px_1fr] items-baseline">
                  <span className="font-bold text-slate-700">Scheme</span>
                  <span className="text-slate-500 font-bold">:</span>
                  <span className="font-semibold text-slate-900 leading-tight">{quotation.scheme}</span>
                </div>
                <div className="grid grid-cols-[100px_10px_1fr] items-baseline whitespace-nowrap">
                  <span className="font-bold text-slate-700 whitespace-nowrap">Project Capacity</span>
                  <span className="text-slate-500 font-bold">:</span>
                  <span className="font-bold text-slate-900 whitespace-nowrap">{quotation.capacityKw} kWp</span>
                </div>
              </div>

              {/* To Customer Address Block */}
              <div className="text-xs mb-5 space-y-1 font-sans">
                <div className="font-bold text-slate-700">To</div>
                <div className="font-black text-slate-950 text-[13px]">{quotation.clientName}</div>
                {quotation.location && (
                  <div className="text-slate-700 leading-snug whitespace-pre-line">{quotation.location}</div>
                )}
                {(quotation.contactPhone || quotation.contactEmail) && (
                  <div className="text-[11px] text-slate-600 flex items-center gap-3 pt-0.5">
                    {quotation.contactPhone && <span>Ph: {quotation.contactPhone}</span>}
                    {quotation.contactEmail && <span>Email: {quotation.contactEmail}</span>}
                  </div>
                )}
              </div>

              {/* Subject */}
              <div className="text-xs text-slate-900 mb-5">
                <span className="font-bold">Subject : </span>
                <span className="font-normal">
                  {renderFormattedText(
                    interpolateSubject(quotation.subject || `Proposal for ${quotation.capacityKw} kWp Roof top Solar`, {
                      capacityKw: quotation.capacityKw,
                      capacityKwp: quotation.capacityKwp || quotation.capacityKw,
                      connectionType: quotation.connectionType,
                      scheme: quotation.scheme,
                      clientName: quotation.clientName,
                      projectName: quotation.projectName,
                      location: quotation.location
                    })
                  )}
                </span>
              </div>

              {/* Salutation & Intro */}
              <div className="text-xs text-slate-700 leading-relaxed mb-6 space-y-2.5">
                <p className="font-semibold text-slate-800">{quotation.salutation || 'Dear Valued Customer,'}</p>
                {(() => {
                  const rawIntro = quotation.introOpeningText || getToolsIntroText();
                  const interpolated = interpolateOpeningText(rawIntro, {
                    connectionType: quotation.connectionType,
                    targetSegment: quotation.targetSegment,
                    scheme: quotation.scheme,
                    capacityKw: quotation.capacityKw,
                    clientName: quotation.clientName,
                    projectName: quotation.projectName
                  });
                  
                  const paragraphs = interpolated.split(/\r?\n+/).map(p => p.trim()).filter(Boolean);
                  return paragraphs.map((para, pIdx) => (
                    <p key={pIdx}>{renderFormattedText(para)}</p>
                  ));
                })()}
              </div>

              {/* Scope of Work */}
              <div className="space-y-4 font-sans mb-4">
                <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase">
                  SCOPE OF WORK
                </h3>

                {/* Supply Includes */}
                <div>
                  <div className="text-xs font-bold text-slate-800 mb-1.5">Supply Includes:</div>
                  <ul className="text-[11.5px] text-slate-700 space-y-1.5 list-disc pl-5 leading-snug">
                    {(() => {
                      const isBoqBatteryNil = !quotation.boqItems?.some(b => (b.slNo === 3 || b.id === 'boq-3' || b.itemDescription?.toLowerCase().includes('battery')) && b.quantity && !b.quantity.toLowerCase().includes('nil') && b.quantity !== '0' && b.quantity !== '0 Nos');
                      const isBoqStructureNil = !quotation.boqItems?.some(b => (b.slNo === 4 || b.id === 'boq-4' || b.itemDescription?.toLowerCase().includes('structure') || b.itemDescription?.toLowerCase().includes('mounting')) && b.quantity && !b.quantity.toLowerCase().includes('nil') && b.quantity !== '0' && b.quantity !== '0 Feet' && b.quantity !== '0 ft');

                      let rawList = [...(quotation.supplyIncludes || [])];

                      // If structure is active in BOQ (not Nil) and not present in supplyIncludes, dynamically inject it
                      if (!isBoqStructureNil) {
                        const hasStructureInSupply = rawList.some(item => {
                          const lower = item.toLowerCase();
                          return (lower.includes('structure') || lower.includes('mounting') || lower.includes('flush mount') || lower.includes('rcc')) && !lower.includes('nil');
                        });
                        if (!hasStructureInSupply) {
                          const boqStruct = quotation.boqItems?.find(b => b.slNo === 4 || b.id === 'boq-4' || b.itemDescription?.toLowerCase().includes('structure') || b.itemDescription?.toLowerCase().includes('mounting'));
                          const structText = boqStruct?.itemDescription || 'Mounting Structure (Hot-Dip Galvanized / Anodized)';
                          // Insert after inverters/modules
                          rawList.splice(2, 0, structText);
                        }
                      }

                      return rawList
                        .map((item) => {
                          // Strip dropdown headings/prefixes so only chosen items are shown
                          let cleanItem = item.replace(/^(?:solar\s*pv\s*modules?|grid-tied\s*\/\s*hybrid\s*solar\s*inverter|module\s*mounting\s*structures?|mounting\s*structures?|battery\s*energy\s*storage|battery\s*storage|battery)\s*[:–-]\s*/i, '').trim();
                          // Remove redundant qty annotations from Supply Includes (quantity belongs in Item Description BOQ table only)
                          cleanItem = cleanItem.replace(/\s*\((?:qty:\s*)?\d+\s*nos\)/gi, '').trim();
                          cleanItem = cleanItem.replace(/\s*\(\s*nill?[^)]*\)/gi, '').trim();
                          // Replace any remaining "Nill" with "Nil"
                          cleanItem = cleanItem.replace(/\bNill\b/gi, 'Nil');
                          return cleanItem;
                        })
                        .filter((cleanItem) => {
                          if (!cleanItem || !cleanItem.trim()) return false;
                          const lower = cleanItem.toLowerCase().trim();
                          // Omit if it's "Nil", "0", or bare category names that denote zero/nil items
                          if (lower === 'nil' || lower.includes('nill') || lower === '0' || lower === '0 nos' || lower === '0 feet') return false;
                          
                          // If BOQ indicates battery is Nil, omit any battery supply line
                          if (isBoqBatteryNil && lower.includes('battery')) return false;
                          // If BOQ indicates structure is Nil, omit any structure supply line
                          if (isBoqStructureNil && (lower.includes('structure') || lower.includes('mounting'))) return false;

                          return true;
                        })
                        .map((cleanItem, idx) => (
                          <li key={idx}>{renderFormattedText(cleanItem)}</li>
                        ));
                    })()}
                  </ul>
                </div>

                {/* Installation Includes */}
                <div>
                  <div className="text-xs font-bold text-slate-800 mb-1.5">Installation Includes:</div>
                  <ul className="text-[11.5px] text-slate-700 space-y-1.5 list-disc pl-5 leading-snug">
                    {quotation.installationIncludes.map((item, idx) => (
                      <li key={idx}>{renderFormattedText(item)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {renderFooter(1)}
          </div>

          {/* ========================================================================= */}
          {/* PAGE 2: ANNEXURE A – PROJECT COST & TAXATION                              */}
          {/* ========================================================================= */}
          <div className="a4-page w-[210mm] min-h-[297mm] h-[297mm] bg-white text-slate-900 p-[15mm] shadow-2xl rounded-sm flex flex-col justify-between relative overflow-hidden print:shadow-none print:m-0 print:p-[15mm] print:break-after-page">
            <div className="flex flex-col">
              {renderHeader(2)}

              {/* Annexure Header Banner */}
              <div className="bg-slate-800 text-white text-center py-2 rounded-sm mb-5">
                <h2 className="text-xs font-black tracking-wider uppercase">
                  ANNEXURE A – PROJECT COST
                </h2>
              </div>

              {/* Offer Metadata Table */}
              <div className="border border-slate-300 text-xs mb-5 rounded-sm overflow-hidden">
                <div className="grid grid-cols-2 divide-x divide-slate-300">
                  <div className="divide-y divide-slate-300">
                    <div className="grid grid-cols-[140px_12px_1fr] items-baseline p-1.5"><span className="font-bold text-slate-700">Date of Offer</span><span className="text-slate-500 font-bold">:</span><span>{formattedDate}</span></div>
                    <div className="grid grid-cols-[140px_12px_1fr] items-baseline p-1.5"><span className="font-bold text-slate-700">Price Validity</span><span className="text-slate-500 font-bold">:</span><span>{formattedValidityDate}</span></div>
                    <div className="grid grid-cols-[140px_12px_1fr] items-baseline p-1.5"><span className="font-bold text-slate-700">Offer No.</span><span className="text-slate-500 font-bold">:</span><span className="font-bold">{quotation.offerNo}</span></div>
                    <div className="grid grid-cols-[140px_12px_1fr] items-baseline p-1.5"><span className="font-bold text-slate-700">Client Name</span><span className="text-slate-500 font-bold">:</span><span>{quotation.clientName}</span></div>
                  </div>
                  <div className="divide-y divide-slate-300">
                    <div className="grid grid-cols-[160px_12px_1fr] items-baseline p-1.5"><span className="font-bold text-slate-700">Site Location</span><span className="text-slate-500 font-bold">:</span><span>{siteLocationFormatted}</span></div>
                    <div className="grid grid-cols-[160px_12px_1fr] items-baseline p-1.5"><span className="font-bold text-slate-700">Project Capacity (kW)</span><span className="text-slate-500 font-bold">:</span><span>{quotation.capacityKw} Kw</span></div>
                    <div className="grid grid-cols-[160px_12px_1fr] items-baseline p-1.5"><span className="font-bold text-slate-700">Project Capacity (kWp)</span><span className="text-slate-500 font-bold">:</span><span>{quotation.capacityKwp || quotation.capacityKw} kWp</span></div>
                    <div className="grid grid-cols-[160px_12px_1fr] items-baseline p-1.5"><span className="font-bold text-slate-700">Grid Evacuation Voltage (kV)</span><span className="text-slate-500 font-bold">:</span><span>{quotation.gridEvacuationVoltage || '—'}</span></div>
                  </div>
                </div>
              </div>

              {/* Cost BOQ Table */}
              <table className="w-full text-xs border border-slate-400 border-collapse mb-5 font-sans">
                <thead>
                  <tr className="bg-slate-800 text-white text-[11px] font-bold">
                    <th className="border border-slate-500 py-1.5 px-2 w-12 text-center">SL No</th>
                    <th className="border border-slate-500 py-1.5 px-3 text-center">Item Description</th>
                    <th className="border border-slate-500 py-1.5 px-3 w-24 text-center">Quantity</th>
                    <th className="border border-slate-500 py-1.5 px-3 w-32 text-right">Total Price (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {quotation.boqItems.map((item, index) => {
                    let desc = item.itemDescription || '';
                    // Strip dropdown headings/prefixes so only chosen items are shown
                    desc = desc.replace(/^(?:solar\s*pv\s*modules?|solar\s*inverter|grid-tied\s*\/\s*hybrid\s*solar\s*inverter|battery(?:\s*energy)?(?:\s*storage)?|mounting\s*structure|module\s*mounting\s*structure)\s*[-–:]\s*/i, '').trim();
                    // Clean elevation feet from structure description if present (elevation feet belongs in Quantity column only)
                    desc = desc.replace(/\s*\((?:elevated\s*)?\d+(?:\s*(?:to|-)\s*\d+)?\+?\s*(?:feet|ft|height)\)/gi, '');
                    desc = desc.replace(/\s*elevation\s*\d+(?:\s*(?:to|-)\s*\d+)?\+?\s*(?:feet|ft)/gi, '');
                    desc = desc.replace(/\s*\d+(?:\s*(?:to|-)\s*\d+)?\+?\s*(?:feet|ft)\s*(?:height)?/gi, '');
                    desc = desc.replace(/\s*\(\s*\)/g, '').trim();

                    // Clean quantity
                    let qty = item.quantity || '';
                    if (qty.toLowerCase() === 'nill') qty = 'Nil';

                    // Check for item 3 (Battery) and item 4 (Mounting Structure) nil states
                    const isBatteryRow = item.slNo === 3 || item.id === 'boq-3' || (item.itemDescription && item.itemDescription.toLowerCase().includes('battery'));
                    const isStructureRow = item.slNo === 4 || item.id === 'boq-4' || (item.itemDescription && (item.itemDescription.toLowerCase().includes('structure') || item.itemDescription.toLowerCase().includes('mounting')));

                    if (isBatteryRow) {
                      if (qty.toLowerCase().includes('nil') || qty === '0' || qty === '0 Nos' || desc.toLowerCase().includes('nil') || !desc) {
                        desc = 'Battery';
                        qty = 'Nil';
                      }
                    } else if (isStructureRow) {
                      if (qty.toLowerCase().includes('nil') || qty === '0' || qty === '0 Feet' || qty === '0 ft' || desc.toLowerCase().includes('nil') || !desc) {
                        desc = 'Mounting Structure';
                        qty = 'Nil';
                      }
                    }

                    if (!desc) desc = item.itemDescription;

                    return (
                      <tr key={item.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="border border-slate-300 py-1.5 px-2 text-center font-bold">{item.slNo}</td>
                        <td className="border border-slate-300 py-1.5 px-3 text-left">{desc}</td>
                        <td className="border border-slate-300 py-1.5 px-3 text-center">{qty}</td>
                        {index === 0 && (
                          <td 
                            rowSpan={quotation.boqItems.length} 
                            className="border border-slate-400 py-2 px-3 text-right font-black align-middle text-sm text-slate-900 bg-amber-50/30 tabular-nums"
                          >
                            {quotation.basicCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-100 font-bold text-[11.5px] border-t-2 border-slate-400">
                    <td className="border border-slate-300 py-1.5 px-2 text-center">A</td>
                    <td colSpan={2} className="border border-slate-300 py-1.5 px-3 uppercase text-slate-900">
                      Total Project Cost (Basic – EPC)
                    </td>
                    <td className="border border-slate-300 py-1.5 px-3 text-right font-black text-slate-950 tabular-nums">
                      {quotation.basicCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Taxes (GST) Breakdown */}
              <table className="w-full text-xs border border-slate-400 border-collapse mb-5 font-sans">
                <thead>
                  <tr className="bg-slate-700 text-white text-[11px] font-bold">
                    <th colSpan={4} className="border border-slate-500 py-1.5 px-3 text-center uppercase tracking-wider">
                      TAXES (GST)
                    </th>
                  </tr>
                  <tr className="bg-slate-100 text-slate-800 text-[10.5px] font-bold">
                    <th className="border border-slate-300 py-1 px-3 text-left">Component</th>
                    <th className="border border-slate-300 py-1 px-3 w-28 text-center">Component %</th>
                    <th className="border border-slate-300 py-1 px-3 w-20 text-center">GST %</th>
                    <th className="border border-slate-300 py-1 px-3 w-32 text-right">Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  <tr>
                    <td className="border border-slate-300 py-1.5 px-3">80% Project Cost @ 5%</td>
                    <td className="border border-slate-300 py-1.5 px-3 text-center">80%</td>
                    <td className="border border-slate-300 py-1.5 px-3 text-center">5%</td>
                    <td className="border border-slate-300 py-1.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                      {quotation.gstGoodsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 py-1.5 px-3">20% Project Cost @ 18%</td>
                    <td className="border border-slate-300 py-1.5 px-3 text-center">20%</td>
                    <td className="border border-slate-300 py-1.5 px-3 text-center">18%</td>
                    <td className="border border-slate-300 py-1.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                      {quotation.gstServicesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold border-t border-slate-300">
                    <td className="border border-slate-300 py-1.5 px-2 text-center">B</td>
                    <td colSpan={2} className="border border-slate-300 py-1.5 px-3 uppercase text-slate-900">Total GST</td>
                    <td className="border border-slate-300 py-1.5 px-3 text-right font-black text-slate-950 tabular-nums">
                      {quotation.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Special Discount */}
              {quotation.specialDiscount > 0 && (
                <div className="flex items-center justify-between border border-slate-400 bg-slate-100 p-2.5 text-xs font-bold mb-5">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-bold">C</span>
                    <span className="uppercase text-slate-900">Special Discount</span>
                  </div>
                  <span className="text-right font-black text-rose-700 pr-1.5 tabular-nums">
                    {quotation.specialDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Grand Total Bar */}
              <div className="bg-slate-900 text-white p-3.5 rounded-sm flex items-center justify-between text-xs font-black mb-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[#f7b944] font-mono">
                    {quotation.specialDiscount > 0 ? 'D = A + B - C' : 'C = A + B'}
                  </span>
                  <span className="uppercase tracking-wider">Grand Total (EPC) – Inclusive of Taxes, To Pay Amount</span>
                </div>
                <div className="text-base text-[#f7b944] tracking-tight font-black tabular-nums">
                  ₹ {quotation.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Subsidy Callout Box */}
              {(quotation.subsidyNote || getToolsSubsidyNote()) && (
                <div className="border border-rose-400 bg-rose-50/60 text-rose-900 p-3 rounded-sm text-[11px] font-semibold leading-relaxed">
                  <span className="font-black text-rose-700">Note: </span>
                  {quotation.subsidyNote || getToolsSubsidyNote()}
                </div>
              )}
            </div>

            {renderFooter(2)}
          </div>

          {/* ========================================================================= */}
          {/* PAGE 3: PAYMENT TERMS, BANKING, TERMS & CONDITIONS & WARRANTY             */}
          {/* ========================================================================= */}
          <div className="a4-page w-[210mm] min-h-[297mm] h-[297mm] bg-white text-slate-900 p-[15mm] shadow-2xl rounded-sm flex flex-col justify-between relative overflow-hidden print:shadow-none print:m-0 print:p-[15mm] print:break-after-page">
            <div className="flex flex-col">
              {renderHeader(3)}

              {/* Payment Terms */}
              <div className="mb-6 text-xs font-sans">
                <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase mb-2">
                  PAYMENT TERMS
                </h3>
                <div className="border border-slate-300 bg-slate-50/50 p-3 rounded-sm space-y-2 text-slate-800 text-[11.5px]">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                    <span><strong>{quotation.advancePaymentPercent ?? 50}%</strong> Advance with order</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                    <span><strong>{quotation.deliveryPaymentPercent ?? 40}%</strong> Against delivery of materials</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                    <span><strong>{quotation.installationPaymentPercent ?? 10}%</strong> After installation</span>
                  </div>
                </div>
              </div>

              {/* Banking Details */}
              <div className="mb-6">
                <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase mb-2">
                  BANKING DETAILS
                </h3>
                <div className="text-xs space-y-2 border border-slate-300 bg-slate-50/50 p-3 rounded-sm font-sans">
                  <div className="grid grid-cols-[180px_12px_1fr] items-baseline"><span className="font-bold text-slate-700">Account Beneficiary Name</span><span className="text-slate-500 font-bold">:</span><span className="font-extrabold text-slate-900">{quotation.beneficiaryName}</span></div>
                  <div className="grid grid-cols-[180px_12px_1fr] items-baseline"><span className="font-bold text-slate-700">Account Number</span><span className="text-slate-500 font-bold">:</span><span className="font-bold text-slate-900 tabular-nums">{quotation.accountNumber}</span></div>
                  <div className="grid grid-cols-[180px_12px_1fr] items-baseline"><span className="font-bold text-slate-700">Account Type</span><span className="text-slate-500 font-bold">:</span><span>{quotation.accountType}</span></div>
                  <div className="grid grid-cols-[180px_12px_1fr] items-baseline"><span className="font-bold text-slate-700">IFSC Code</span><span className="text-slate-500 font-bold">:</span><span className="font-bold text-slate-900">{quotation.ifscCode}</span></div>
                  <div className="grid grid-cols-[180px_12px_1fr] items-baseline"><span className="font-bold text-slate-700">MICR Number</span><span className="text-slate-500 font-bold">:</span><span className="tabular-nums">{quotation.micrNumber}</span></div>
                  <div className="grid grid-cols-[180px_12px_1fr] items-baseline"><span className="font-bold text-slate-700">Bank Address</span><span className="text-slate-500 font-bold">:</span><span className="leading-tight">{quotation.bankAddress}</span></div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="mb-6">
                <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase mb-2">
                  TERMS & CONDITIONS
                </h3>
                <ol className="text-[11px] text-slate-700 space-y-1.5 list-decimal pl-5 leading-snug">
                  {quotation.termsAndConditions.map((term, idx) => (
                    <li key={idx}>{renderFormattedText(term)}</li>
                  ))}
                </ol>
              </div>

              {/* Warranty */}
              <div className="mb-5">
                <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase mb-2">
                  WARRANTY
                </h3>
                <div className="text-[11px] text-slate-800 space-y-2 leading-snug font-sans">
                  <div className="grid grid-cols-[160px_12px_1fr] items-baseline">
                    <span className="font-bold text-slate-900">Solar Modules</span>
                    <span className="text-slate-500 font-bold">:</span>
                    <span>{quotation.moduleWarrantyYears} Year Warranty (12 years manufacturing defect warranty - 0–12 years: 90% performance warranty - 12–25 years: 81% performance warranty)</span>
                  </div>
                  <div className="grid grid-cols-[160px_12px_1fr] items-baseline">
                    <span className="font-bold text-slate-900">Grid Tied Inverter</span>
                    <span className="text-slate-500 font-bold">:</span>
                    <span>{quotation.inverterWarrantyYears} years warranty from date of supply</span>
                  </div>
                  <div className="grid grid-cols-[160px_12px_1fr] items-baseline">
                    <span className="font-bold text-slate-900">Balance of System</span>
                    <span className="text-slate-500 font-bold">:</span>
                    <span>{quotation.balanceOfSystemWarrantyYears} year warranty from date of supply</span>
                  </div>
                  <div className="text-[10px] text-slate-600 italic mt-1">
                    Consumables such as fuses, surge protection devices, AC adaptors, contactor coils, switches, etc., are excluded from warranty.
                  </div>
                </div>
              </div>

              {/* Project Completion */}
              <div className="mb-1">
                <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase mb-1.5">
                  PROJECT COMPLETION
                </h3>
                <p className="text-[11px] text-slate-800 leading-snug">
                  {quotation.projectCompletionWeeks} from the date of receipt of purchase order along with advance payment and drawing approval.
                </p>
              </div>
            </div>

            {renderFooter(3)}
          </div>

          {/* ========================================================================= */}
          {/* PAGE 4: ESTIMATED SOLAR BENEFITS & BRAND DECLARATIONS                    */}
          {/* ========================================================================= */}
          <div className="a4-page w-[210mm] min-h-[297mm] h-[297mm] bg-white text-slate-900 p-[15mm] shadow-2xl rounded-sm flex flex-col justify-between relative overflow-hidden print:shadow-none print:m-0 print:p-[15mm] print:break-after-page">
            <div className="flex flex-col">
              {renderHeader(4)}

              {/* Estimated Solar Benefits Header */}
              <div className="mb-7">
                <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase mb-3.5">
                  ESTIMATED SOLAR BENEFITS:
                </h3>

                {/* Benefits Matrix Table */}
                <table className="w-full text-xs border border-slate-400 border-collapse mb-3.5 font-sans">
                  <thead>
                    <tr className="bg-slate-800 text-white text-[10.5px] font-bold text-center">
                      <th className="border border-slate-500 py-1.5 px-2">Solar System</th>
                      <th className="border border-slate-500 py-1.5 px-2">Bi-Monthly Generation (Units)</th>
                      <th className="border border-slate-500 py-1.5 px-2">Bi-Monthly EB Saving (₹)</th>
                      <th className="border border-slate-500 py-1.5 px-2">Annual Saving (₹)</th>
                      <th className="border border-slate-500 py-1.5 px-2">5 Years Saving (₹)</th>
                      <th className="border border-slate-500 py-1.5 px-2">10 Years Saving (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] text-center font-sans">
                    {displayBenefits.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="border border-slate-300 py-1.5 px-2 font-bold text-slate-900">{row.solarSystem}</td>
                        <td className="border border-slate-300 py-1.5 px-2 tabular-nums">{row.biMonthlyGenerationUnits}</td>
                        <td className="border border-slate-300 py-1.5 px-2 font-bold text-emerald-800 tabular-nums">{row.biMonthlyEbSavings}</td>
                        <td className="border border-slate-300 py-1.5 px-2 font-bold text-emerald-800 tabular-nums">{row.annualSavings}</td>
                        <td className="border border-slate-300 py-1.5 px-2 font-bold text-emerald-900 tabular-nums">{row.fiveYearsSavings}</td>
                        <td className="border border-slate-300 py-1.5 px-2 font-bold text-emerald-950 bg-emerald-50/40 tabular-nums">{row.tenYearsSavings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Assumptions */}
                <div className="text-[11px] text-slate-700 space-y-1.5 mt-3">
                  <div className="font-bold text-slate-800">Assumptions:</div>
                  <ul className="list-disc pl-5 space-y-1">
                    {quotation.tariffAssumptions.map((assump, idx) => (
                      <li key={idx}>{renderFormattedText(assump)}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Brand Declaration Header */}
              <div>
                <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase mb-3.5">
                  BRAND DECLARATION:
                </h3>

                {/* Brand Matrix Table */}
                <table className="w-full text-xs border border-slate-400 border-collapse mb-3.5 font-sans">
                  <thead>
                    <tr className="bg-slate-700 text-white text-[10.5px] font-bold">
                      <th className="border border-slate-500 py-1 px-2 w-12 text-center">S. No.</th>
                      <th className="border border-slate-500 py-1 px-3 text-left">Description</th>
                      <th className="border border-slate-500 py-1 px-3 w-36 text-left">Brand</th>
                      <th className="border border-slate-500 py-1 px-3 w-48 text-left">Warranty / Specification</th>
                    </tr>
                  </thead>
                  <tbody className="text-[10.5px]">
                    {quotation.brandDeclarations.map((brand) => (
                      <tr key={brand.slNo} className={brand.slNo % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}>
                        <td className="border border-slate-300 py-1 px-2 text-center font-bold">{brand.slNo}</td>
                        <td className="border border-slate-300 py-1 px-3">{renderFormattedText(brand.description)}</td>
                        <td className="border border-slate-300 py-1 px-3 font-semibold text-slate-900">{renderFormattedText(brand.brand)}</td>
                        <td className="border border-slate-300 py-1 px-3 text-slate-700">{renderFormattedText(brand.warrantySpec)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Brand Notes */}
                {(quotation.brandNotes || []).length > 0 && (
                  <div className="text-[10.5px] text-slate-700 space-y-1 mt-3">
                    <div className="font-bold text-slate-800">Notes:</div>
                    <ol className="list-decimal pl-5 space-y-1 leading-snug">
                      {(quotation.brandNotes || []).map((note, idx) => (
                        <li key={idx}>{renderFormattedText(note)}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>

            {renderFooter(4)}
          </div>

          {/* ========================================================================= */}
          {/* PAGE 5: TECHNICAL ASSUMPTIONS, EXCLUSIONS & SIGNATURE                     */}
          {/* ========================================================================= */}
          <div className="a4-page w-[210mm] min-h-[297mm] h-[297mm] bg-white text-slate-900 p-[15mm] shadow-2xl rounded-sm flex flex-col justify-between relative overflow-hidden print:shadow-none print:m-0 print:p-[15mm] print:break-after-page">
            <div className="flex flex-col">
              {renderHeader(5)}

              {/* Technical Assumptions */}
              <div className="mb-7">
                <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase mb-3">
                  TECHNICAL ASSUMPTIONS
                </h3>
                <ul className="text-[11.5px] text-slate-700 space-y-2 list-disc pl-5 leading-snug">
                  {quotation.technicalAssumptions.map((item, idx) => (
                    <li key={idx} className="whitespace-pre-line">{renderFormattedText(item)}</li>
                  ))}
                </ul>
              </div>

              {/* Exclusions */}
              <div className="mb-7">
                <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase mb-3">
                  EXCLUSIONS
                </h3>
                <ol className="text-[11.5px] text-slate-700 space-y-1.5 list-decimal pl-5 leading-snug">
                  {quotation.exclusions.map((item, idx) => (
                    <li key={idx}>{renderFormattedText(item)}</li>
                  ))}
                </ol>
              </div>

              {/* Disclaimer */}
              <div className="mb-7">
                <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase mb-2.5">
                  DISCLAIMER
                </h3>
                <p className="text-[11px] text-slate-600 leading-relaxed text-justify">
                  {renderFormattedText(quotation.warrantyDisclaimer)}
                </p>
              </div>

              {/* Authorized Signatory & Official Stamp (Left Aligned) */}
              <div className="mt-8 flex justify-start items-start pl-2">
                <div className="flex flex-col items-start text-left">
                  <div className="text-xs font-black text-slate-950 mb-2 uppercase tracking-wide">
                    For {quotation.signatoryDesignation || 'OMMAX ELECTRIC PRIVATE LIMITED'}
                  </div>

                  {/* Stamp & Signature Frame */}
                  <div className="relative flex items-center justify-start my-2 min-h-[50px]">
                    {quotation.companyStampUrl ? (
                      <img 
                        src={quotation.companyStampUrl} 
                        alt="Authorized Signatory Stamp" 
                        className="object-contain"
                        style={{
                          width: `${stampWidth}px`,
                          maxWidth: '240px',
                          maxHeight: '120px',
                          transform: `rotate(${stampRotate}deg)`,
                          opacity: stampOpacity
                        }}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-start justify-center p-1 text-slate-600">
                        <div className="font-serif italic text-xl font-bold text-slate-800 rotate-[-2deg] tracking-wider select-none">
                          {quotation.authorizedSignatoryName || 'Authorized Signatory'}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-xs font-bold text-slate-800 border-t border-slate-400 pt-1 w-44">
                    {quotation.authorizedSignatoryName || 'Authorized Signatory'}
                  </div>
                </div>
              </div>
            </div>

            {renderFooter(5)}
          </div>

        </div>
      </div>

      {/* In-App Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-emerald-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold">
                <Send className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Submit Solar Proposal</h3>
                <p className="text-[11px] text-slate-500 font-mono font-bold">{quotation.offerNo}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Are you sure you want to submit this quotation for <strong>{quotation.clientName}</strong>? Once submitted, it will be saved with status <strong>Submitted</strong>, and subsequent edits will generate a revised offer number (e.g., R-01, R-02).
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitModal(false);
                  if (onSubmitQuotation) {
                    onSubmitQuotation(quotation);
                  }
                }}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
