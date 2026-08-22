/**
 * Language Detector — src/renderer/src/services/languageDetector.js
 *
 * Centralized, extension-first language detection.
 * Used by: file import UI, coding actions, prompt builder, syntax highlighting hints.
 *
 * Strategy:
 *  1. Map file extension → language (fast, reliable)
 *  2. Content-based heuristic only when extension is absent or ambiguous
 *  3. Return a canonical language string compatible with react-syntax-highlighter
 */

// ─── Extension → Language Map ─────────────────────────────────────────────────

const EXTENSION_MAP = {
  // JavaScript ecosystem
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  mjs: 'javascript',
  cjs: 'javascript',

  // Python
  py: 'python',
  pyw: 'python',
  pyi: 'python',

  // Systems
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',
  cs: 'csharp',
  rs: 'rust',
  go: 'go',
  zig: 'zig',

  // JVM
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  scala: 'scala',
  groovy: 'groovy',

  // Web
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  svelte: 'svelte',
  vue: 'html',  // rough fallback

  // Data / Config
  json: 'json',
  json5: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  ini: 'ini',
  conf: 'ini',
  xml: 'xml',
  csv: 'text',

  // Shell
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  fish: 'bash',
  ps1: 'powershell',
  bat: 'batch',
  cmd: 'batch',

  // Database
  sql: 'sql',
  pgsql: 'sql',
  mysql: 'sql',

  // Mobile / Other
  swift: 'swift',
  dart: 'dart',
  rb: 'ruby',
  php: 'php',
  lua: 'lua',
  r: 'r',
  m: 'matlab',
  jl: 'julia',
  ex: 'elixir',
  exs: 'elixir',
  clj: 'clojure',
  cljs: 'clojure',
  hs: 'haskell',
  elm: 'elm',
  erl: 'erlang',
  fs: 'fsharp',
  fsx: 'fsharp',

  // Docs / Text
  md: 'markdown',
  mdx: 'markdown',
  txt: 'text',
  rst: 'text',

  // Docker / CI
  dockerfile: 'dockerfile',
  makefile: 'makefile',
}

// ─── Display Names ────────────────────────────────────────────────────────────

const DISPLAY_NAMES = {
  javascript: 'JavaScript',
  jsx: 'JSX',
  typescript: 'TypeScript',
  tsx: 'TSX',
  python: 'Python',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  rust: 'Rust',
  go: 'Go',
  java: 'Java',
  kotlin: 'Kotlin',
  scala: 'Scala',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sass: 'Sass',
  less: 'Less',
  json: 'JSON',
  yaml: 'YAML',
  toml: 'TOML',
  xml: 'XML',
  sql: 'SQL',
  bash: 'Bash',
  sh: 'Shell',
  powershell: 'PowerShell',
  swift: 'Swift',
  dart: 'Dart',
  ruby: 'Ruby',
  php: 'PHP',
  lua: 'Lua',
  r: 'R',
  markdown: 'Markdown',
  dockerfile: 'Dockerfile',
  makefile: 'Makefile',
  text: 'Plain Text',
}

// ─── Content-Based Heuristics (fallback only) ─────────────────────────────────

/**
 * Try to detect language from content when extension is unknown.
 * Only reliable signals — return null if uncertain.
 * @param {string} content
 * @returns {string|null}
 */
function detectFromContent (content) {
  const firstLine = content.trim().split('\n')[0] || ''

  if (firstLine.startsWith('#!/usr/bin/env python') || firstLine.startsWith('#!/usr/bin/python')) return 'python'
  if (firstLine.startsWith('#!/bin/bash') || firstLine.startsWith('#!/bin/sh')) return 'bash'
  if (firstLine.startsWith('#!/usr/bin/env node')) return 'javascript'
  if (firstLine.startsWith('#!/usr/bin/ruby')) return 'ruby'
  if (firstLine.startsWith('<?php')) return 'php'
  if (firstLine.startsWith('<?xml') || firstLine.startsWith('<html')) return 'html'

  // Structural signals
  if (content.includes('def ') && content.includes(':') && content.includes('import ')) return 'python'
  if (content.includes('func ') && content.includes('package ')) return 'go'
  if (content.includes('fn ') && content.includes('let mut') && content.includes('->')) return 'rust'
  if (content.includes('public static void main') || content.includes('System.out.println')) return 'java'
  if (content.includes('#include <') && (content.includes('int main') || content.includes('void main'))) return 'cpp'
  if (content.includes('SELECT ') && content.includes('FROM ')) return 'sql'
  if (content.includes('"scripts"') && content.includes('"dependencies"')) return 'json'

  return null
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Detect the programming language from a file name and optionally its content.
 *
 * @param {string} fileName - File name with extension (e.g. "utils.py", "index.js")
 * @param {string} [content=''] - File content (used only if extension is missing/ambiguous)
 * @returns {string} Language string (e.g. 'python', 'javascript', 'text')
 */
export function detectLanguage (fileName = '', content = '') {
  if (!fileName) return detectFromContent(content) || 'text'

  // Extract extension — handle dotfiles like ".bashrc" → 'bash' not found, falls back
  const parts = fileName.split('.')
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''

  // Special filenames without extension
  const baseLower = fileName.toLowerCase()
  if (baseLower === 'dockerfile') return 'dockerfile'
  if (baseLower === 'makefile' || baseLower === 'gnumakefile') return 'makefile'
  if (baseLower === '.bashrc' || baseLower === '.bash_profile' || baseLower === '.zshrc') return 'bash'

  if (ext && EXTENSION_MAP[ext]) return EXTENSION_MAP[ext]

  // Fallback to content-based detection
  return detectFromContent(content) || 'text'
}

/**
 * Get the human-readable display name for a language.
 * @param {string} language - Internal language string
 * @returns {string} Display name (e.g. 'Python', 'TypeScript')
 */
export function getLanguageDisplayName (language = 'text') {
  return DISPLAY_NAMES[language] || language.charAt(0).toUpperCase() + language.slice(1)
}

/**
 * Get the file extensions associated with a language.
 * Useful for file type filters.
 * @param {string} language
 * @returns {string[]}
 */
export function getExtensionsForLanguage (language) {
  return Object.entries(EXTENSION_MAP)
    .filter(([, lang]) => lang === language)
    .map(([ext]) => ext)
}
