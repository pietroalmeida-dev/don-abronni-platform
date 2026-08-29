import { describe, it, expect } from 'vitest';
import { formatCurrency, gerarNumeroNota, formatarDataHora, formatarCep } from './format';

describe('formatCurrency', () => {
  it('formata um valor com centavos no padrão brasileiro (vírgula, 2 casas)', () => {
    expect(formatCurrency(37.99)).toBe('R$ 37,99');
  });

  it('sempre mostra 2 casas decimais, mesmo em valor inteiro', () => {
    expect(formatCurrency(50)).toBe('R$ 50,00');
  });

  it('arredonda corretamente valores com mais de 2 casas (erro de ponto flutuante)', () => {
    // 0.1 + 0.2 em JS não dá exatamente 0.3 — é exatamente o tipo de bug de
    // dinheiro que passa despercebido numa tela sem um teste garantindo o
    // arredondamento final exibido ao cliente.
    expect(formatCurrency(0.1 + 0.2)).toBe('R$ 0,30');
  });

  it('trata null/undefined/string vazia como zero, em vez de "R$ NaN"', () => {
    expect(formatCurrency(null)).toBe('R$ 0,00');
    expect(formatCurrency(undefined)).toBe('R$ 0,00');
    expect(formatCurrency('')).toBe('R$ 0,00');
  });
});

describe('gerarNumeroNota', () => {
  it('gera no formato DA-AAAAMMDD-NNN', () => {
    expect(gerarNumeroNota()).toMatch(/^DA-\d{8}-\d{3}$/);
  });

  it('duas chamadas seguidas não geram exatamente o mesmo número (parte aleatória)', () => {
    // Não é 100% garantido (a parte aleatória pode colidir por acaso), mas com
    // 999 combinações possíveis a chance de falso-negativo é desprezível — o
    // objetivo do teste é pegar um bug óbvio tipo "sequência sempre fixa em 1".
    const numeros = new Set(Array.from({ length: 20 }, () => gerarNumeroNota()));
    expect(numeros.size).toBeGreaterThan(1);
  });
});

describe('formatarDataHora', () => {
  it('formata uma data ISO válida no padrão brasileiro', () => {
    expect(formatarDataHora('2026-08-06T12:00:00.000Z')).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('retorna um traço (—) para entrada vazia, em vez de quebrar', () => {
    expect(formatarDataHora(null)).toBe('—');
    expect(formatarDataHora(undefined)).toBe('—');
  });

  it('retorna um traço (—) para uma string que não é uma data, em vez de "Invalid Date"', () => {
    expect(formatarDataHora('não-é-uma-data')).toBe('—');
  });
});

describe('formatarCep', () => {
  it('insere o hífen depois do 5º dígito', () => {
    expect(formatarCep('02987100')).toBe('02987-100');
  });

  it('ignora caracteres não numéricos digitados pelo usuário', () => {
    expect(formatarCep('02987-100')).toBe('02987-100');
  });

  it('não insere hífen antes de ter 6 dígitos', () => {
    expect(formatarCep('0298')).toBe('0298');
  });

  it('trunca em 8 dígitos (CEP não tem mais que isso)', () => {
    expect(formatarCep('029871009999')).toBe('02987-100');
  });
});
