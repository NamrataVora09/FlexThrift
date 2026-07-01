'use client';

import React, { useState, useRef, useEffect } from 'react';

interface HexColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  placeholder?: string;
}

const HEX_RE = /^#[0-9A-F]{6}$/;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function sanitizeHexDraft(raw: string) {
  const cleaned = String(raw).replace(/[^#0-9a-fA-F]/g, '');
  const noHash = cleaned.replace(/#/g, '');
  return '#' + noHash.slice(0, 6).toUpperCase();
}

function isValidHex(hex: string) {
  return HEX_RE.test(hex);
}

function hexToRgb(hex: string) {
  if (!isValidHex(hex)) return null;
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b]
    .map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

export default function HexColorPicker({ value, onChange, placeholder = '#000000' }: HexColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hex, setHex] = useState(value || placeholder);
  const [h, setH] = useState(183);
  const [s, setS] = useState(0.59);
  const [v, setV] = useState(0.57);
  const [status, setStatus] = useState<'ok' | 'error'>('ok');
  const [statusText, setStatusText] = useState('Valid 6-digit hex');
  const [copyText, setCopyText] = useState('Copy');

  const wrapperRef = useRef<HTMLDivElement>(null);
  const svBoxRef = useRef<HTMLDivElement>(null);
  const hueBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && isValidHex(value)) {
      const rgb = hexToRgb(value);
      if (rgb) {
        const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        setH(hsv.h);
        setS(hsv.s);
        setV(hsv.v);
        setHex(value);
      }
    }
  }, [value]);

  const updateFromHex = (newHex: string) => {
    const rgb = hexToRgb(newHex);
    if (!rgb) return;
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    setHex(newHex);
    setH(hsv.h);
    setS(hsv.s);
    setV(hsv.v);
  };

  const updateFromHsv = () => {
    const rgb = hsvToRgb(h, s, v);
    const newHex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setHex(newHex);
  };

  const handleSVClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!svBoxRef.current) return;
    const rect = svBoxRef.current.getBoundingClientRect();
    const newS = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const newV = clamp(1 - (e.clientY - rect.top) / rect.height, 0, 1);
    setS(newS);
    setV(newV);
    updateFromHsv();
  };

  const handleSVMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1 || !svBoxRef.current) return;
    handleSVClick(e);
  };

  const handleHueClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hueBarRef.current) return;
    const rect = hueBarRef.current.getBoundingClientRect();
    const newH = clamp(((e.clientX - rect.left) / rect.width) * 360, 0, 360);
    setH(newH);
    updateFromHsv();
  };

  const handleHueMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1 || !hueBarRef.current) return;
    handleHueClick(e);
  };

  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = sanitizeHexDraft(e.target.value);
    e.target.value = cleaned;

    if (isValidHex(cleaned)) {
      updateFromHex(cleaned);
      setStatus('ok');
      setStatusText('Valid 6-digit hex');
    } else {
      setStatus('error');
      setStatusText('Enter exactly 6 hex digits');
    }
  };

  const handleHexBlur = () => {
    if (!isValidHex(hex)) {
      setHex(value || placeholder);
      setStatus('ok');
      setStatusText('Valid 6-digit hex');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopyText('Copied');
      setTimeout(() => setCopyText('Copy'), 1200);
    } catch {
      setCopyText('Failed');
      setTimeout(() => setCopyText('Copy'), 1200);
    }
  };

  const handleApply = () => {
    onChange(hex);
    setIsOpen(false);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="hex-color-picker-wrapper" style={{ position: 'relative', maxWidth: '420px' }}>
      <input
        type="text"
        readOnly
        value={hex}
        onClick={() => setIsOpen(true)}
        onFocus={() => setIsOpen(true)}
        style={{
          width: '100%',
          height: '52px',
          border: '1px solid #d8d8d8',
          borderRadius: '14px',
          background: '#fff',
          padding: '0 14px',
          fontSize: '18px',
          fontWeight: 700,
          letterSpacing: '0.05em',
          cursor: 'pointer',
          outline: 'none',
        }}
      />

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            left: 0,
            width: '100%',
            background: '#ffffff',
            border: '1px solid #ddd',
            borderRadius: '20px',
            boxShadow: '0 18px 45px rgba(0,0,0,0.12)',
            padding: '16px',
            zIndex: 20,
          }}
        >
          <div
            ref={svBoxRef}
            onClick={handleSVClick}
            onMouseMove={handleSVMove}
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1 / 1',
              borderRadius: '18px',
              overflow: 'hidden',
              cursor: 'crosshair',
              touchAction: 'none',
              border: '2px solid #dff4f5',
              background: `hsl(${h} 100% 50%)`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to right, #fff 0%, rgba(255,255,255,0) 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0) 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: '18px',
                height: '18px',
                border: '2px solid #fff',
                borderRadius: '50%',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.2)',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                left: `${s * 100}%`,
                top: `${(1 - v) * 100}%`,
              }}
            />
          </div>

          <div
            ref={hueBarRef}
            onClick={handleHueClick}
            onMouseMove={handleHueMove}
            style={{
              position: 'relative',
              height: '18px',
              marginTop: '14px',
              borderRadius: '999px',
              overflow: 'hidden',
              cursor: 'pointer',
              touchAction: 'none',
              background: 'linear-gradient(90deg, #ff0000 0%, #ffff00 16.66%, #00ff00 33.33%, #00ffff 50%, #0000ff 66.66%, #ff00ff 83.33%, #ff0000 100%)',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: '18px',
                height: '18px',
                border: '2px solid #fff',
                borderRadius: '50%',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.2)',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                left: `${(h / 360) * 100}%`,
                top: '50%',
              }}
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <input
              type="text"
              maxLength={7}
              value={hex}
              onChange={handleHexInput}
              onBlur={handleHexBlur}
              style={{
                width: '100%',
                height: '50px',
                border: '1px solid #d8d8d8',
                borderRadius: '14px',
                background: '#fff',
                padding: '0 14px',
                fontSize: '18px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                outline: 'none',
              }}
            />
            <div
              style={{
                marginTop: '8px',
                minHeight: '18px',
                fontSize: '12px',
                color: status === 'error' ? '#c62828' : '#2e7d32',
              }}
            >
              {statusText}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                flex: 1,
                height: '44px',
                border: 0,
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: '#ececec',
                color: '#222',
              }}
            >
              {copyText}
            </button>
            <button
              type="button"
              onClick={handleApply}
              style={{
                flex: 1,
                height: '44px',
                border: 0,
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: '#111827',
                color: '#fff',
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
