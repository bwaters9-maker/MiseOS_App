import React, { useState } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import type { Recipe, MenuTemplate } from '../types';

const ADVISORY =
  'Consuming raw or undercooked meat, poultry, eggs, or seafood may increase your risk of foodborne illness. Please alert your server to any allergies.';

export interface GuestMenuGroup {
  key: string;
  label: string;
  recipes: Recipe[];
}

interface GuestMenuPreviewProps {
  groups: GuestMenuGroup[];
  template: MenuTemplate;
  onTemplateChange: (t: MenuTemplate) => void;
  onExit: () => void;
}

const GuestMenuPreview: React.FC<GuestMenuPreviewProps> = ({ groups, template, onTemplateChange, onExit }) => {
  const [printedAt, setPrintedAt] = useState('');

  const handlePrint = () => {
    setPrintedAt(
      new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) +
      ' — ' +
      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    );
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          @page { size: letter portrait; margin: 0.4in; }
          header, .no-print { display: none !important; }
          .print-show { display: block !important; }
          body, html, main { background: white !important; padding: 0 !important; margin: 0 !important; }
          .guest-menu-paper { box-shadow: none !important; }
        }
        .guest-menu-paper, .guest-menu-paper * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .menu-classic {
          --paper: #f5efe1; --ink: #2e2519; --muted: #8a7a5c; --rule: #a9863f; --deep: #6d1c26;
          background: var(--paper); color: var(--ink);
          font-family: Georgia, "Iowan Old Style", "Palatino Linotype", serif;
        }
        .menu-classic .crest { text-align: center; margin-bottom: 22px; }
        .menu-classic .crest .flourish { color: var(--rule); font-size: 13px; letter-spacing: .5em; margin: 0 0 6px; }
        .menu-classic .crest h2 { margin: 0; font-size: 27px; font-variant-caps: small-caps; letter-spacing: .06em; font-weight: 400; }
        .menu-classic .rule { border: none; border-top: 1px solid var(--rule); width: 100%; margin: 18px 0 24px; position: relative; }
        .menu-classic .rule::after {
          content: "\\2756"; position: absolute; top: -9px; left: 50%; transform: translateX(-50%);
          background: var(--paper); padding: 0 10px; color: var(--rule); font-size: 11px;
        }
        .menu-classic .cols { column-count: 2; column-gap: 32px; }
        .menu-classic .cat-block { break-inside: avoid; margin-bottom: 22px; }
        .menu-classic .cat { text-align: center; font-size: 12.5px; font-variant-caps: small-caps; letter-spacing: .18em; color: var(--deep); margin: 0 0 12px; font-weight: 700; }
        .menu-classic .dish { margin: 0 0 14px; break-inside: avoid; }
        .menu-classic .dish-head { display: flex; align-items: baseline; gap: 6px; }
        .menu-classic .dish-head .n { font-size: 14px; font-weight: 700; }
        .menu-classic .dish-head .p { margin-left: auto; font-size: 13.5px; font-variant-numeric: tabular-nums; }
        .menu-classic .desc { margin: 2px 0 0; font-style: italic; font-size: 11.5px; line-height: 1.45; color: var(--muted); }
        .menu-classic .advisory { margin-top: 26px; padding-top: 14px; border-top: 1px solid var(--rule); text-align: center; font-size: 9.5px; font-style: italic; color: var(--muted); line-height: 1.5; }

        .menu-modern {
          --paper: #fbfaf6; --ink: #1f2320; --muted: #6c7166; --accent: #54654f; --line: #d8d4c6;
          background: var(--paper); color: var(--ink);
          font-family: Cambria, Georgia, serif;
        }
        .menu-modern .head { display: flex; align-items: flex-end; justify-content: space-between; border-bottom: 2px solid var(--ink); padding-bottom: 14px; margin-bottom: 26px; }
        .menu-modern .head h2 { margin: 0; font-size: 24px; letter-spacing: -.01em; font-weight: 400; }
        .menu-modern .cat { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 10.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); margin: 26px 0 12px; }
        .menu-modern .cat-block:first-of-type .cat { margin-top: 0; }
        .menu-modern .dish { margin: 0 0 15px; padding-bottom: 15px; border-bottom: 1px solid var(--line); break-inside: avoid; }
        .menu-modern .dish:last-child { border-bottom: none; }
        .menu-modern .dish-head { display: flex; align-items: baseline; gap: 8px; }
        .menu-modern .dish-head .n { font-size: 15px; font-weight: 600; }
        .menu-modern .dish-head .leader { flex: 1; border-bottom: 1px dotted var(--line); transform: translateY(-3px); }
        .menu-modern .dish-head .p { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--accent); }
        .menu-modern .desc { margin: 4px 0 0; font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.5; color: var(--muted); }
        .menu-modern .advisory { margin-top: 22px; font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 9.5px; color: var(--muted); line-height: 1.5; }

        @media (max-width: 760px) {
          .menu-classic .cols { column-count: 1; }
        }
      `}</style>

      <div className="print-page">
        <div className="no-print flex flex-wrap items-center justify-between gap-[13px] mb-[21px]">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-[8px] px-[13px] py-[8px] bg-zinc-900 border border-zinc-700 rounded-[8px] text-xs font-bold text-zinc-300 hover:text-emerald-400 hover:border-emerald-700 transition-colors duration-[144ms]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Operational View
          </button>

          <div className="flex items-center gap-[13px]">
            <div className="flex bg-zinc-900 border border-zinc-700 rounded-[8px] overflow-hidden">
              <button
                type="button"
                onClick={() => onTemplateChange('classic')}
                className={`px-[13px] py-[8px] text-xs font-bold uppercase tracking-wider transition-colors duration-[144ms] ${template === 'classic' ? 'bg-emerald-700 text-white' : 'text-zinc-400 hover:text-zinc-100'}`}
              >
                Classic
              </button>
              <button
                type="button"
                onClick={() => onTemplateChange('clean')}
                className={`px-[13px] py-[8px] text-xs font-bold uppercase tracking-wider transition-colors duration-[144ms] border-l border-zinc-700 ${template === 'clean' ? 'bg-emerald-700 text-white' : 'text-zinc-400 hover:text-zinc-100'}`}
              >
                Clean
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-[8px] px-[13px] py-[8px] bg-zinc-900 border border-zinc-700 rounded-[8px] text-xs font-bold text-zinc-300 hover:text-emerald-400 hover:border-emerald-700 transition-colors duration-[144ms]"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[55px] text-center">
            <p className="text-xs text-zinc-500">No priced menu items yet. Set a menu price on a recipe in the Recipe Builder to include it here.</p>
          </div>
        ) : template === 'classic' ? (
          <div className="guest-menu-paper menu-classic max-w-[890px] mx-auto rounded-[6px] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)] px-[55px] py-[44px]">
            <div className="crest">
              <p className="flourish">&mdash;</p>
              <h2>Menu</h2>
            </div>
            <hr className="rule" />
            <div className="cols">
              {groups.map(group => (
                <div key={group.key} className="cat-block">
                  <p className="cat">{group.label}</p>
                  {group.recipes.map(recipe => (
                    <div key={recipe.id} className="dish">
                      <div className="dish-head">
                        <span className="n">{recipe.name}</span>
                        <span className="p">${(recipe.menuPrice as number).toFixed(2)}</span>
                      </div>
                      {recipe.menuDescription && <p className="desc">{recipe.menuDescription}</p>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="advisory">{ADVISORY}</p>
          </div>
        ) : (
          <div className="guest-menu-paper menu-modern max-w-[720px] mx-auto rounded-[6px] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)] px-[55px] py-[44px]">
            <div className="head">
              <h2>Menu</h2>
            </div>
            {groups.map(group => (
              <div key={group.key} className="cat-block">
                <p className="cat">{group.label}</p>
                {group.recipes.map(recipe => (
                  <div key={recipe.id} className="dish">
                    <div className="dish-head">
                      <span className="n">{recipe.name}</span>
                      <span className="leader" />
                      <span className="p">${(recipe.menuPrice as number).toFixed(2)}</span>
                    </div>
                    {recipe.menuDescription && <p className="desc">{recipe.menuDescription}</p>}
                  </div>
                ))}
              </div>
            ))}
            <p className="advisory">{ADVISORY}</p>
          </div>
        )}

        <p className="print-show hidden text-center text-[10px] text-zinc-500 mt-[13px]">Printed: {printedAt}</p>
      </div>
    </>
  );
};

export default GuestMenuPreview;
