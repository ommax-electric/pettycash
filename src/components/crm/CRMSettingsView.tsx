import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  Save, 
  Layers, 
  Tag, 
  Check, 
  Plus, 
  Trash2
} from 'lucide-react';
import { CRMSettings } from '../../crm/types';
import { User, AppSettings } from '../../types';

interface CRMSettingsViewProps {
  crmSettings: CRMSettings;
  currentUser: User;
  appSettings?: AppSettings;
  onUpdateCRMSettings: (settings: CRMSettings) => Promise<void>;
}

export default function CRMSettingsView({
  crmSettings,
  currentUser,
  appSettings,
  onUpdateCRMSettings
}: CRMSettingsViewProps) {
  const [settings, setSettings] = useState<CRMSettings>(crmSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [newLeadSource, setNewLeadSource] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onUpdateCRMSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving CRM settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLeadSource = () => {
    if (!newLeadSource.trim()) return;
    if (!settings.leadSources.includes(newLeadSource.trim())) {
      setSettings({
        ...settings,
        leadSources: [...settings.leadSources, newLeadSource.trim()]
      });
      setNewLeadSource('');
    }
  };

  const handleRemoveLeadSource = (src: string) => {
    setSettings({
      ...settings,
      leadSources: settings.leadSources.filter(s => s !== src)
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Save bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900">CRM Module Configuration</h3>
          <p className="text-xs text-slate-400 mt-0.5">Customize pipeline stages, probability weighting, and lead origination channels.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#f7b944] text-slate-950 rounded-xl text-xs font-extrabold shadow-sm hover:bg-[#e5aa3b] transition-all cursor-pointer disabled:opacity-50 w-full sm:w-auto"
        >
          {saveSuccess ? <Check className="w-4 h-4 text-emerald-950 stroke-[3]" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving...' : saveSuccess ? 'Saved Successfully' : 'Save CRM Settings'}
        </button>
      </div>

      {/* 1. PIPELINE STAGES & PROBABILITY WEIGHTING */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-slate-900">Pipeline Stages & Win Probability</h4>
            <p className="text-xs text-slate-400">Configure default probability percentages used for weighted forecasting</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {settings.pipelineStages.map((stage, index) => (
            <div 
              key={stage.id}
              className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: stage.color }}></span>
                <div>
                  <p className="font-bold text-slate-900">{stage.label}</p>
                  <span className="text-[10px] font-mono text-slate-400">{stage.id}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-slate-500 font-medium">Default Probability:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={stage.probability}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10) || 0;
                      const updated = [...settings.pipelineStages];
                      updated[index] = { ...stage, probability: val };
                      setSettings({ ...settings, pipelineStages: updated });
                    }}
                    className="w-16 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f7b944]"
                  />
                  <span className="font-bold text-slate-600">%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. LEAD SOURCES */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-slate-900">Lead Source Channels</h4>
            <p className="text-xs text-slate-400">Origination channels for new sales opportunities</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add new source (e.g. Partner Channel)..."
            value={newLeadSource}
            onChange={e => setNewLeadSource(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddLeadSource()}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#f7b944]"
          />
          <button
            onClick={handleAddLeadSource}
            className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {settings.leadSources.map(src => (
            <span 
              key={src}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              {src}
              <button 
                onClick={() => handleRemoveLeadSource(src)}
                className="hover:text-red-600 text-slate-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

    </div>
  );
}
