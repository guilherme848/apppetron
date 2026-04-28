import type { DiscQuestion } from '@/types/disc';

// 24 grupos × 4 adjetivos (1 por dimensão D/I/S/C).
// O candidato escolhe MAIS parecido e MENOS parecido em cada grupo.
// Ordem dos adjetivos é embaralhada por grupo pra evitar viés posicional.

export const DISC_QUESTIONS: DiscQuestion[] = [
  {
    id: 1,
    options: [
      { label: 'Determinado', dimension: 'D' },
      { label: 'Comunicativo', dimension: 'I' },
      { label: 'Paciente', dimension: 'S' },
      { label: 'Cuidadoso', dimension: 'C' },
    ],
  },
  {
    id: 2,
    options: [
      { label: 'Otimista', dimension: 'I' },
      { label: 'Preciso', dimension: 'C' },
      { label: 'Audacioso', dimension: 'D' },
      { label: 'Constante', dimension: 'S' },
    ],
  },
  {
    id: 3,
    options: [
      { label: 'Cooperativo', dimension: 'S' },
      { label: 'Detalhista', dimension: 'C' },
      { label: 'Animado', dimension: 'I' },
      { label: 'Competitivo', dimension: 'D' },
    ],
  },
  {
    id: 4,
    options: [
      { label: 'Analítico', dimension: 'C' },
      { label: 'Direto', dimension: 'D' },
      { label: 'Calmo', dimension: 'S' },
      { label: 'Entusiasta', dimension: 'I' },
    ],
  },
  {
    id: 5,
    options: [
      { label: 'Falante', dimension: 'I' },
      { label: 'Decidido', dimension: 'D' },
      { label: 'Sistemático', dimension: 'C' },
      { label: 'Leal', dimension: 'S' },
    ],
  },
  {
    id: 6,
    options: [
      { label: 'Modesto', dimension: 'S' },
      { label: 'Forte', dimension: 'D' },
      { label: 'Lógico', dimension: 'C' },
      { label: 'Expressivo', dimension: 'I' },
    ],
  },
  {
    id: 7,
    options: [
      { label: 'Organizado', dimension: 'C' },
      { label: 'Sociável', dimension: 'I' },
      { label: 'Exigente', dimension: 'D' },
      { label: 'Gentil', dimension: 'S' },
    ],
  },
  {
    id: 8,
    options: [
      { label: 'Pacificador', dimension: 'S' },
      { label: 'Persuasivo', dimension: 'I' },
      { label: 'Cauteloso', dimension: 'C' },
      { label: 'Independente', dimension: 'D' },
    ],
  },
  {
    id: 9,
    options: [
      { label: 'Líder', dimension: 'D' },
      { label: 'Charmoso', dimension: 'I' },
      { label: 'Atencioso', dimension: 'S' },
      { label: 'Reservado', dimension: 'C' },
    ],
  },
  {
    id: 10,
    options: [
      { label: 'Metódico', dimension: 'C' },
      { label: 'Confiável', dimension: 'S' },
      { label: 'Inspirador', dimension: 'I' },
      { label: 'Ousado', dimension: 'D' },
    ],
  },
  {
    id: 11,
    options: [
      { label: 'Espontâneo', dimension: 'I' },
      { label: 'Equilibrado', dimension: 'S' },
      { label: 'Conservador', dimension: 'C' },
      { label: 'Inflexível', dimension: 'D' },
    ],
  },
  {
    id: 12,
    options: [
      { label: 'Disciplinado', dimension: 'C' },
      { label: 'Encantador', dimension: 'I' },
      { label: 'Conciliador', dimension: 'S' },
      { label: 'Persistente', dimension: 'D' },
    ],
  },
  {
    id: 13,
    options: [
      { label: 'Despretensioso', dimension: 'S' },
      { label: 'Brincalhão', dimension: 'I' },
      { label: 'Prudente', dimension: 'C' },
      { label: 'Autossuficiente', dimension: 'D' },
    ],
  },
  {
    id: 14,
    options: [
      { label: 'Formal', dimension: 'C' },
      { label: 'Magnético', dimension: 'I' },
      { label: 'Sereno', dimension: 'S' },
      { label: 'Combativo', dimension: 'D' },
    ],
  },
  {
    id: 15,
    options: [
      { label: 'Dedicado', dimension: 'S' },
      { label: 'Autoritário', dimension: 'D' },
      { label: 'Animado', dimension: 'I' },
      { label: 'Perfeccionista', dimension: 'C' },
    ],
  },
  {
    id: 16,
    options: [
      { label: 'Demonstrativo', dimension: 'I' },
      { label: 'Firme', dimension: 'D' },
      { label: 'Ouvinte', dimension: 'S' },
      { label: 'Ponderado', dimension: 'C' },
    ],
  },
  {
    id: 17,
    options: [
      { label: 'Aventureiro', dimension: 'D' },
      { label: 'Criterioso', dimension: 'C' },
      { label: 'Estável', dimension: 'S' },
      { label: 'Espirituoso', dimension: 'I' },
    ],
  },
  {
    id: 18,
    options: [
      { label: 'Acolhedor', dimension: 'S' },
      { label: 'Resoluto', dimension: 'D' },
      { label: 'Exato', dimension: 'C' },
      { label: 'Expansivo', dimension: 'I' },
    ],
  },
  {
    id: 19,
    options: [
      { label: 'Meticuloso', dimension: 'C' },
      { label: 'Compreensivo', dimension: 'S' },
      { label: 'Confiante', dimension: 'D' },
      { label: 'Alegre', dimension: 'I' },
    ],
  },
  {
    id: 20,
    options: [
      { label: 'Eufórico', dimension: 'I' },
      { label: 'Receptivo', dimension: 'S' },
      { label: 'Decisivo', dimension: 'D' },
      { label: 'Estruturado', dimension: 'C' },
    ],
  },
  {
    id: 21,
    options: [
      { label: 'Combativo', dimension: 'D' },
      { label: 'Empolgado', dimension: 'I' },
      { label: 'Solícito', dimension: 'S' },
      { label: 'Pontual', dimension: 'C' },
    ],
  },
  {
    id: 22,
    options: [
      { label: 'Tolerante', dimension: 'S' },
      { label: 'Convidativo', dimension: 'I' },
      { label: 'Determinante', dimension: 'D' },
      { label: 'Diligente', dimension: 'C' },
    ],
  },
  {
    id: 23,
    options: [
      { label: 'Vigoroso', dimension: 'D' },
      { label: 'Otimista', dimension: 'I' },
      { label: 'Conciliador', dimension: 'S' },
      { label: 'Perspicaz', dimension: 'C' },
    ],
  },
  {
    id: 24,
    options: [
      { label: 'Pioneiro', dimension: 'D' },
      { label: 'Vibrante', dimension: 'I' },
      { label: 'Diplomático', dimension: 'S' },
      { label: 'Investigador', dimension: 'C' },
    ],
  },
];
