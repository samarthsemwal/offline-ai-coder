/**
 * Language Detector Tests — src/tests/languageDetector.test.js
 *
 * Covers:
 * - Extension-to-language mapping for 25+ file types
 * - Special filenames without extensions (Dockerfile, Makefile, .bashrc)
 * - Content-based heuristic fallback
 * - Display name resolution
 * - Edge cases: empty, dotfiles, unknown extensions
 */
import { describe, it, expect } from 'vitest'
import {
  detectLanguage,
  getLanguageDisplayName,
  getExtensionsForLanguage
} from '../renderer/src/services/languageDetector.js'

// ── Extension mapping ─────────────────────────────────────────────────────────

describe('detectLanguage — extension mapping', () => {
  const cases = [
    // JavaScript ecosystem
    ['index.js', 'javascript'],
    ['App.jsx', 'jsx'],
    ['types.ts', 'typescript'],
    ['Component.tsx', 'tsx'],
    ['config.mjs', 'javascript'],
    // Python
    ['main.py', 'python'],
    ['script.pyw', 'python'],
    // Systems
    ['hello.c', 'c'],
    ['app.cpp', 'cpp'],
    ['lib.rs', 'rust'],
    ['main.go', 'go'],
    ['App.cs', 'csharp'],
    // JVM
    ['Main.java', 'java'],
    ['App.kt', 'kotlin'],
    // Web
    ['style.css', 'css'],
    ['app.scss', 'scss'],
    ['page.html', 'html'],
    // Data / Config
    ['config.json', 'json'],
    ['settings.yaml', 'yaml'],
    ['settings.yml', 'yaml'],
    ['config.toml', 'toml'],
    // Shell
    ['deploy.sh', 'bash'],
    ['build.bash', 'bash'],
    ['install.ps1', 'powershell'],
    // Database
    ['schema.sql', 'sql'],
    // Mobile
    ['ViewController.swift', 'swift'],
    ['Widget.dart', 'dart'],
    // Docs
    ['README.md', 'markdown'],
  ]

  it.each(cases)('detects %s as %s', (filename, expected) => {
    expect(detectLanguage(filename)).toBe(expected)
  })
})

// ── Special filenames ─────────────────────────────────────────────────────────

describe('detectLanguage — special filenames', () => {
  it('detects Dockerfile', () => {
    expect(detectLanguage('Dockerfile')).toBe('dockerfile')
  })

  it('detects Makefile', () => {
    expect(detectLanguage('Makefile')).toBe('makefile')
  })

  it('detects GNUmakefile', () => {
    expect(detectLanguage('GNUmakefile')).toBe('makefile')
  })

  it('detects .bashrc', () => {
    expect(detectLanguage('.bashrc')).toBe('bash')
  })

  it('detects .zshrc', () => {
    expect(detectLanguage('.zshrc')).toBe('bash')
  })
})

// ── Unknown extensions fall through to content heuristics ────────────────────

describe('detectLanguage — content heuristics', () => {
  it('detects Python from shebang', () => {
    const content = '#!/usr/bin/env python3\nimport os\n\ndef main():\n    pass'
    expect(detectLanguage('noext', content)).toBe('python')
  })

  it('detects Bash from shebang', () => {
    const content = '#!/bin/bash\necho "Hello"'
    expect(detectLanguage('noext', content)).toBe('bash')
  })

  it('detects Go from structural signals', () => {
    const content = 'package main\n\nfunc main() {\n  fmt.Println("Hello")\n}'
    expect(detectLanguage('noext', content)).toBe('go')
  })

  it('detects Java from System.out.println', () => {
    const content = 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello");\n  }\n}'
    expect(detectLanguage('noext', content)).toBe('java')
  })

  it('detects SQL from SELECT..FROM', () => {
    const content = 'SELECT id, name FROM users WHERE active = 1;'
    expect(detectLanguage('noext', content)).toBe('sql')
  })

  it('falls back to text for unknown content', () => {
    expect(detectLanguage('', 'random non-code text here')).toBe('text')
  })
})

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('detectLanguage — edge cases', () => {
  it('handles empty filename and content', () => {
    expect(detectLanguage('', '')).toBe('text')
  })

  it('handles undefined filename', () => {
    expect(detectLanguage(undefined)).toBe('text')
  })

  it('handles unknown extension gracefully', () => {
    // Should try content detection, then fall back to text
    expect(detectLanguage('file.xyz123')).toBe('text')
  })

  it('is case-insensitive for extensions', () => {
    expect(detectLanguage('App.PY')).toBe('python')
    expect(detectLanguage('Script.JS')).toBe('javascript')
  })
})

// ── Display names ─────────────────────────────────────────────────────────────

describe('getLanguageDisplayName', () => {
  it('returns JavaScript for javascript', () => {
    expect(getLanguageDisplayName('javascript')).toBe('JavaScript')
  })

  it('returns TypeScript for typescript', () => {
    expect(getLanguageDisplayName('typescript')).toBe('TypeScript')
  })

  it('capitalizes unknown languages', () => {
    expect(getLanguageDisplayName('cobol')).toBe('Cobol')
  })

  it('handles empty string', () => {
    // Falls back to '' capitalized, which is still ''
    const result = getLanguageDisplayName('')
    expect(typeof result).toBe('string')
  })
})

// ── getExtensionsForLanguage ──────────────────────────────────────────────────

describe('getExtensionsForLanguage', () => {
  it('returns js and jsx for javascript', () => {
    const exts = getExtensionsForLanguage('javascript')
    expect(exts).toContain('js')
    expect(exts).toContain('mjs')
  })

  it('returns py for python', () => {
    expect(getExtensionsForLanguage('python')).toContain('py')
  })

  it('returns empty array for unknown language', () => {
    expect(getExtensionsForLanguage('unknownlang')).toEqual([])
  })
})
