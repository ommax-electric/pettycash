import React, { useState } from 'react';
import { FolderCheck, FileCode, Check, Copy, Server, Database, KeyRound, ArrowRight, Terminal, Globe, ShieldCheck, Sparkles, BookOpen, Lock } from 'lucide-react';

export default function PhpPackageExplorer() {
  const [activeFile, setActiveFile] = useState('README.md');
  const [copied, setCopied] = useState(false);

  // File collection mapped directly to the actual created php-package files
  const files: Record<string, { label: string; lang: string; code: string; desc: string }> = {
    'composer.json': {
      label: 'composer.json',
      lang: 'json',
      desc: 'Composer configuration with vlucas/phpdotenv dependency and PSR-4 autoloader mapping for PettyCash\\Installer.',
      code: `{
    "name": "ommax/petty-cash-register",
    "description": "Corporate Petty Cash Register - Commercial Installable Web Package",
    "type": "project",
    "license": "proprietary",
    "require": {
        "php": ">=8.2",
        "vlucas/phpdotenv": "^5.5"
    },
    "autoload": {
        "psr-4": {
            "PettyCash\\\\Installer\\\\": "install/src/"
        }
    },
    "config": {
        "optimize-autoloader": true,
        "sort-packages": true
    }
}`
    },
    'README.md': {
      label: 'Setup Guide (README)',
      lang: 'markdown',
      desc: 'Zero-configuration deployment guide with web wizard, Dotenv integration, Composer PSR-4, and security checklists.',
      code: `# Corporate Petty Cash Register - Production Deployment Package

A security-vetted, web-wizard-installable **Petty Cash Register Web Application** built natively in secure PHP (PDO) and styled with modern utility classes.

This package is 100% production-ready and features an **automated web installation wizard**. No manual code or SQL editing is required!

---

## 🚀 Key Improvements & Architecture Highlights

1. **Installer Lockdown**: After setup completes, HTTP access to \`/install\` is automatically blocked using \`install/.htaccess\` (Apache/LiteSpeed) and \`install/.nginx.conf\` rules in addition to \`install.lock\`.
2. **Dotenv & Config**: Replaced legacy static config with secure \`.env\` parameters (via \`vlucas/phpdotenv\`), with backward-compatible constant definitions.
3. **Composer Support**: Full PSR-4 autoloading for \`PettyCash\\Installer\\*\` namespace and Composer integration.
4. **Database Metadata**: Persists \`APP_VERSION\`, \`INSTALLER_VERSION\`, \`INSTALLED_AT\`, and \`LAST_UPDATED_AT\` directly in the \`settings\` table.
5. **Production Error Mode**: Automatic post-install error suppression (\`display_errors = Off\`, \`log_errors = On\`) with safe exception masking.

---

## 🚀 Quick Deployment Guide (3 Easy Steps)

### 1. Upload Files
Upload all files inside the \`/php-package\` folder to your PHP web server document root (e.g., \`/var/www/html/\` or \`public_html/\`).

### 2. Run Web Installer
Open your website domain in any browser (e.g., \`https://yourdomain.com/\`). You will be automatically redirected to the **Installation Wizard** (\`install/index.php\`).

### 3. Complete Setup
Follow the 5-step interactive wizard:
1. **Requirements Check**: Verifies PHP 8.2+, PDO MySQL, Mbstring, cURL, and folder write permissions.
2. **Database Credentials**: Enter your MySQL host, user, and password (it auto-creates the database if missing or guides cPanel creation).
3. **Organization Profile**: Set your Company Name (e.g., Ommax Electric Private Limited), currency symbol (₹, $, €), and timezone.
4. **Administrator Account**: Set your admin username, email, and password.
5. **Auto-Install**: Imports database schema, stores metadata, creates \`.env\` and \`config.php\`, and locks the installer directory.`
    },
    'INSTALL.md': {
      label: 'INSTALL.md (Wizard Steps)',
      lang: 'markdown',
      desc: 'Comprehensive step-by-step installation instructions for cPanel, DirectAdmin, Plesk, Apache & Nginx.',
      code: `# Corporate Petty Cash Register - Installation Guide

## 📋 Step-by-Step Installation Instructions

### Step 1: Upload Files & Run Composer (Optional)
Upload all files directly to your web server's document root (e.g. \`/var/www/html/\` or \`public_html/\`). If using Composer, run:
\`\`\`bash
composer install --no-dev --optimize-autoloader
\`\`\`

### Step 2: Set Folder Permissions
Ensure write permissions (chmod \`0755\`):
- \`/php-package/\` (Root - to write config.php & .env)
- \`/php-package/uploads/\` (Storage for receipt vouchers)
- \`/php-package/install/\` (Storage for install.lock & .htaccess)

### Step 3: Complete Web Wizard
Open \`https://your-domain.com/\` to launch the 5-step setup wizard! Access to \`/install\` will be automatically blocked after completion.`
    },
    'SERVER_REQUIREMENTS.md': {
      label: 'SERVER_REQUIREMENTS.md',
      lang: 'markdown',
      desc: 'System compatibility matrix detailing PHP 8.2+ requirements, extensions, and hosting panel support.',
      code: `# Server Requirements & Compatibility Matrix

- PHP Engine: PHP 8.2.0 or higher
- Database Server: MySQL 5.7+ / MariaDB 10.3+
- Web Server: Apache 2.4, Nginx 1.20+, or LiteSpeed
- Extensions: pdo, pdo_mysql, mbstring, json, curl, openssl
- Package Manager: Composer 2.x (supported)`
    },
    'install/src/ConfigManager.php': {
      label: 'ConfigManager.php (OOP)',
      lang: 'php',
      desc: 'Dynamically generates .env, backward-compatible config.php, production error handlers, and .htaccess / Nginx installer rules.',
      code: `<?php
namespace PettyCash\\Installer;

class ConfigManager {
    public function generateConfigFile(array $db, array $org): bool { ... }
    public function secureUploadsDirectory(): void { ... }
    public function createInstallLock(array $adminData, array $orgData): void {
        // Writes install.lock AND places .htaccess block rules inside /install
    }
}`
    },
    'install/src/DatabaseManager.php': {
      label: 'DatabaseManager.php (OOP)',
      lang: 'php',
      desc: 'Manages DB connectivity, transaction-wrapped schema imports, and persists application metadata (APP_VERSION, INSTALLED_AT, etc.).',
      code: `<?php
namespace PettyCash\\Installer;

class DatabaseManager {
    public function testConnection(): array { ... }
    public function setupSchemaAndData(...): bool {
        // Stores APP_VERSION, INSTALLER_VERSION, INSTALLED_AT, LAST_UPDATED_AT
    }
}`
    },
    'install/src/Installer.php': {
      label: 'Installer.php (Orchestrator)',
      lang: 'php',
      desc: 'Master installer class orchestrating requirements, database transaction, final verification, and lock file creation.',
      code: `<?php
namespace PettyCash\\Installer;

class Installer {
    public function isInstalled(): bool {
        // Verifies install.lock, .htaccess block rules, or .env / config.php
    }
}`
    },
    'install/index.php': {
      label: 'install/index.php (Wizard UI)',
      lang: 'php',
      desc: 'Interactive 5-step installer wizard checking server specs, DB parameters, organization profile, and admin creation with 403 lock handling.',
      code: `<?php
/**
 * Corporate Petty Cash Register - Web Installation Wizard
 */

$installer = new PettyCash\\Installer\\Installer(__DIR__ . '/..');
if ($installer->isInstalled()) {
    http_response_code(403); // Blocks access completely after setup
}
?>`
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(files[activeFile].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Card */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-md relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10">
          <FolderCheck className="w-64 h-64" />
        </div>
        <div className="relative max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Commercial Installable Package
            </span>
            <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-blue-400" />
              Dotenv, Composer & Lock Security
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Enterprise Commercial Package (/php-package)</h2>
          <p className="text-slate-300 text-xs leading-relaxed mt-2">
            The production-ready PHP package features an automated installer with <code className="font-mono bg-slate-950 px-1.5 py-0.5 rounded text-yellow-400">.htaccess</code> installer directory blocking, <code className="font-mono bg-slate-950 px-1.5 py-0.5 rounded text-yellow-400">vlucas/phpdotenv</code> integration, PSR-4 Composer autoloading, database metadata tracking, and automatic production mode error suppression.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="flex items-center gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
              <Lock className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Installer Lockdown</p>
                <p className="text-xs font-semibold text-slate-100">.htaccess & Nginx Rules</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
              <Database className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Database Metadata</p>
                <p className="text-xs font-semibold text-slate-100">App & Installer Versions</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
              <BookOpen className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Composer & PSR-4</p>
                <p className="text-xs font-semibold text-slate-100">phpdotenv Support</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main File Explorer split-pane */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar file list */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col gap-1 max-h-[580px] overflow-y-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase px-3 mb-2 tracking-wider">Package Contents</span>
          
          {Object.entries(files).map(([key, data]) => {
            const isActive = activeFile === key;
            return (
              <button
                key={key}
                onClick={() => { setActiveFile(key); setCopied(false); }}
                className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer group ${isActive ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-50 text-slate-600'}`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="text-[11px] font-semibold truncate">{data.label}</span>
                </div>
                {!isActive && (
                  <ArrowRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Code Content window */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs lg:col-span-3 overflow-hidden flex flex-col">
          {/* Header controls */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-xs font-mono">{activeFile}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">{files[activeFile].desc}</p>
            </div>
            
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 font-semibold text-[10px] rounded-lg transition-all cursor-pointer border border-slate-200/50"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Code Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy File Code
                </>
              )}
            </button>
          </div>

          {/* Code text block */}
          <div className="bg-slate-950 p-6 overflow-auto text-slate-200 font-mono text-[11px] leading-relaxed max-h-[460px] flex-1">
            <pre className="whitespace-pre">
              <code>{files[activeFile].code}</code>
            </pre>
          </div>
        </div>

      </div>

      {/* Deployment Hardening Checklists */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-slate-500" />
            Automatic Installer .htaccess Lockdown
          </h4>
          <p className="text-slate-500 text-xs leading-relaxed mb-3">
            After successful installation, an isolated <code className="font-mono bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-[11px]">.htaccess</code> file is automatically created inside <code className="font-mono bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-[11px]">/install/</code> to block HTTP web requests:
          </p>
          <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl font-mono text-[10px] text-slate-600 leading-relaxed whitespace-pre overflow-x-auto">
{`# Permanently disable HTTP access to installer
<IfModule mod_authz_core.c>
    Require all denied
</IfModule>
<IfModule !mod_authz_core.c>
    Order deny,allow
    Deny from all
</IfModule>

Options -Indexes`}
          </div>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-slate-500" />
            Nginx Server Block Rule
          </h4>
          <p className="text-slate-500 text-xs leading-relaxed mb-3">
            For Nginx web servers, an equivalent block rule is generated in <code className="font-mono bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-[11px]">/install/.nginx.conf</code>:
          </p>
          <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl font-mono text-[10px] text-slate-600 leading-relaxed whitespace-pre overflow-x-auto">
{`# Nginx block rule for installer directory
location /install {
    deny all;
    return 403;
}`}
          </div>
        </div>
      </div>

    </div>
  );
}
