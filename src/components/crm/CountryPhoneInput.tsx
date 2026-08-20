import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search, Check, Globe } from 'lucide-react';
import { 
  CountryCodeConfig, 
  STANDARD_COUNTRY_CODES, 
  getAllCountryCodes,
  getCountryFromCode, 
  parsePhoneNumber 
} from '../../crm/types';

interface CountryPhoneInputProps {
  id?: string;
  value?: string;
  onChange: (fullPhoneNumber: string) => void;
  placeholder?: string;
  defaultCountryCode?: string;
  allowedCountryCodes?: string[];
  recentCountryCodes?: string[];
  customCountryCodes?: CountryCodeConfig[];
  onSelectCountry?: (code: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function CountryPhoneInput({
  id = 'phone-input',
  value = '',
  onChange,
  placeholder = '94426 20075',
  defaultCountryCode = '+91',
  allowedCountryCodes = ['+91', '+971', '+1', '+44', '+65', '+49', '+966', '+60', '+61'],
  recentCountryCodes = [],
  customCountryCodes = [],
  onSelectCountry,
  required = false,
  disabled = false,
  className = ''
}: CountryPhoneInputProps) {
  // Parse initial value
  const parsed = useMemo(() => {
    return parsePhoneNumber(value, defaultCountryCode);
  }, [value, defaultCountryCode]);

  const [selectedCode, setSelectedCode] = useState<string>(() => {
    return parsed.countryCode || defaultCountryCode;
  });

  const [localNumber, setLocalNumber] = useState<string>(() => {
    return parsed.localNumber || '';
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync internal state when external value changes
  useEffect(() => {
    const p = parsePhoneNumber(value, defaultCountryCode);
    setSelectedCode(p.countryCode);
    setLocalNumber(p.localNumber);
  }, [value, defaultCountryCode]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // All available countries
  const allCountries = useMemo(() => {
    return getAllCountryCodes({ customCountryCodes });
  }, [customCountryCodes]);

  // Current Country Config
  const currentCountry = useMemo(() => {
    return getCountryFromCode(selectedCode, allCountries);
  }, [selectedCode, allCountries]);

  // Filter allowed countries based on admin settings
  const filteredAllowedList = useMemo(() => {
    const allowedSet = new Set(allowedCountryCodes && allowedCountryCodes.length > 0 ? allowedCountryCodes : ['+91']);
    // Always ensure default country code is in the allowed list
    allowedSet.add(defaultCountryCode);

    return allCountries.filter(c => allowedSet.has(c.code));
  }, [allowedCountryCodes, defaultCountryCode, allCountries]);

  // Search filtered list inside dropdown
  const searchedCountries = useMemo(() => {
    if (!searchTerm.trim()) return filteredAllowedList;
    const term = searchTerm.toLowerCase().trim();
    return filteredAllowedList.filter(c => 
      c.name.toLowerCase().includes(term) || 
      c.code.includes(term)
    );
  }, [filteredAllowedList, searchTerm]);

  // Recent countries list (excluding default)
  const recentList = useMemo(() => {
    if (!recentCountryCodes || recentCountryCodes.length === 0) return [];
    return recentCountryCodes
      .filter(code => code !== defaultCountryCode && filteredAllowedList.some(c => c.code === code))
      .map(code => getCountryFromCode(code));
  }, [recentCountryCodes, defaultCountryCode, filteredAllowedList]);

  // Handle local number text input
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    
    // Auto-strip leading +countryCode if user accidentally pasted full international number
    if (raw.startsWith('+')) {
      const p = parsePhoneNumber(raw, selectedCode);
      setSelectedCode(p.countryCode);
      raw = p.localNumber;
    }

    setLocalNumber(raw);

    const cleanNumber = raw.trim();
    if (!cleanNumber) {
      onChange('');
    } else {
      onChange(`${selectedCode} ${cleanNumber}`.trim());
    }
  };

  // Handle selecting a country from dropdown
  const handleSelectCountry = (code: string) => {
    setSelectedCode(code);
    setIsDropdownOpen(false);
    setSearchTerm('');
    if (onSelectCountry) {
      onSelectCountry(code);
    }
    const cleanNumber = localNumber.trim();
    if (cleanNumber) {
      onChange(`${code} ${cleanNumber}`.trim());
    }
  };

  const defaultCountry = getCountryFromCode(defaultCountryCode);

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* 1. Country Code Selector Button */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          type="button"
          id={`${id}-country-btn`}
          disabled={disabled}
          onClick={() => setIsDropdownOpen(prev => !prev)}
          className={`flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 border-r-0 rounded-l-xl text-xs font-bold transition-all cursor-pointer select-none ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title={`Country: ${currentCountry.name} (${currentCountry.code})`}
        >
          <span className="text-base leading-none">{currentCountry.flag}</span>
          <span className="font-mono text-slate-700">{currentCountry.code}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Floating Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* Search Box */}
            <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search country or code..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  autoFocus
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#f7b944]"
                />
              </div>
            </div>

            {/* Countries List */}
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
              
              {/* Section 1: Default Country */}
              {!searchTerm && (
                <div className="p-1.5 bg-amber-50/30">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800/80 px-2 py-1 flex items-center gap-1">
                    <span>★ Default Country</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectCountry(defaultCountry.code)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                      selectedCode === defaultCountry.code ? 'bg-[#f7b944]/20 text-slate-900 font-bold' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base leading-none">{defaultCountry.flag}</span>
                      <span className="truncate">{defaultCountry.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="font-mono text-[11px] text-slate-500 font-semibold">{defaultCountry.code}</span>
                      {selectedCode === defaultCountry.code && <Check className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />}
                    </div>
                  </button>
                </div>
              )}

              {/* Section 2: Recent Countries */}
              {!searchTerm && recentList.length > 0 && (
                <div className="p-1.5 bg-slate-50/50">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                    Recently Used
                  </div>
                  {recentList.map(c => (
                    <button
                      key={`recent-${c.code}`}
                      type="button"
                      onClick={() => handleSelectCountry(c.code)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                        selectedCode === c.code ? 'bg-[#f7b944]/20 text-slate-900 font-bold' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base leading-none">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="font-mono text-[11px] text-slate-500 font-semibold">{c.code}</span>
                        {selectedCode === c.code && <Check className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Section 3: Allowed / Active Countries */}
              <div className="p-1.5">
                {!searchTerm && (
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                    Active Countries ({filteredAllowedList.length})
                  </div>
                )}
                {searchedCountries.length === 0 ? (
                  <div className="py-4 text-center text-slate-400 text-xs">
                    No matching country found
                  </div>
                ) : (
                  searchedCountries.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelectCountry(c.code)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                        selectedCode === c.code ? 'bg-[#f7b944]/20 text-slate-900 font-bold' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base leading-none">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="font-mono text-[11px] text-slate-500 font-semibold">{c.code}</span>
                        {selectedCode === c.code && <Check className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />}
                      </div>
                    </button>
                  ))
                )}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* 2. Clean Phone Number Input */}
      <input
        id={id}
        type="tel"
        value={localNumber}
        onChange={handleNumberChange}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-r-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f7b944] focus:border-transparent transition-all placeholder:text-slate-300 placeholder:font-normal"
      />
    </div>
  );
}
