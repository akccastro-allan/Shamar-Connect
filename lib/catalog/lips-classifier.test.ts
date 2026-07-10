import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyCatalogQuery,
  queryNeedsPositionFromCandidates,
  queryNeedsSideFromCandidates,
  scoreCatalogCandidate,
} from './lips-classifier.ts';

test('correia dentada do gol 2010 excludes accessories and other belt families', () => {
  const query = classifyCatalogQuery('correia dentada do gol 2010');

  assert.equal(query.family, 'correia_dentada');
  assert.equal(query.vehicle, 'gol');
  assert.equal(query.year, 2010);
  assert.deepEqual(query.missingRequiredFields, []);

  const rejected = [
    'CAPA CORREIA DENTADA GOL 10/...',
    'PROTETOR CORREIA DENTADA GOL 10/...',
    'CORR ALT GOL 10/...',
    'BOMBA AGUA GOL C/CORR 10/...',
    'CHAVE COM CORRENTE GOL',
  ];

  for (const name of rejected) {
    const score = scoreCatalogCandidate({ id: name, name, price: 100, stock_quantity: 1 }, query);
    assert.equal(score.familyMatch, false, name);
    assert.ok(score.confidence < 0.75, name);
  }
});

test('pastilha do corolla 2015 asks position when catalog has front and rear', () => {
  const query = classifyCatalogQuery('pastilha do corolla 2015');
  assert.equal(query.family, 'pastilha_freio');
  assert.deepEqual(query.missingRequiredFields, []);

  assert.equal(queryNeedsPositionFromCandidates(query, [
    { name: 'PAST FREIO DIANT COROLLA 14/19', price: 120 },
    { name: 'PAST FREIO TRAS COROLLA 14/19', price: 110 },
  ]), true);
});

test('amortecedor do gol 2012 asks position and side when variants exist', () => {
  const query = classifyCatalogQuery('amortecedor do gol 2012');
  assert.equal(query.family, 'amortecedor');
  assert.deepEqual(query.missingRequiredFields, []);

  const candidates = [
    { name: 'AMORT DIANT GOL 09/16 L.D', price: 220 },
    { name: 'AMORT DIANT GOL 09/16 L.E', price: 220 },
    { name: 'AMORT TRAS GOL 09/16', price: 180 },
  ];

  assert.equal(queryNeedsPositionFromCandidates(query, candidates), true);
  assert.equal(queryNeedsSideFromCandidates({ ...query, position: 'front' }, candidates), true);
});

test('generic filtro asks for filter type', () => {
  const query = classifyCatalogQuery('filtro do palio 2010');

  assert.equal(query.family, null);
  assert.deepEqual(query.missingRequiredFields, ['tipo do filtro']);
});

test('vela do corsa 2008 does not match cabo de vela', () => {
  const query = classifyCatalogQuery('vela do corsa 2008');
  const score = scoreCatalogCandidate({ name: 'CABO VELA CORSA 08/...', price: 80, stock_quantity: 2 }, query);

  assert.equal(query.family, 'vela');
  assert.equal(score.familyMatch, false);
  assert.ok(score.confidence < 0.75);
});

test('price zero never reaches confident price response', () => {
  const query = classifyCatalogQuery('filtro oleo gol 2011');
  const score = scoreCatalogCandidate({ name: 'FILTRO OLEO GOL 05/...', price: 0, stock_quantity: 10 }, query);

  assert.equal(score.familyMatch, true);
  assert.ok(score.confidence < 0.75);
});

test('negative stock is marked for confirmation and never treated as positive stock', () => {
  const query = classifyCatalogQuery('sensor gol 2011');
  const score = scoreCatalogCandidate({ name: 'SENSOR GOL 10/...', price: 90, stock_quantity: -1 }, query);

  assert.equal(score.familyMatch, true);
  assert.equal(score.reasons.includes('stock_negative'), true);
});

test('correia dentada gol without year still rejects capa and protetor', () => {
  const query = classifyCatalogQuery('correia dentada gol');

  assert.deepEqual(query.missingRequiredFields, ['ano do veículo']);

  for (const name of ['CAPA CORREIA DENTADA GOL 10/...', 'PROTETOR CORREIA DENTADA GOL 10/...']) {
    const score = scoreCatalogCandidate({ name, price: 100, stock_quantity: 1 }, query);
    assert.equal(score.familyMatch, false, name);
  }
});
