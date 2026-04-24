// ERP Org Hierarchy — maps company codes to their valid plants / business units
//
// In production ERP systems, the org hierarchy is configured once at go-live and
// rarely changes. A plant always belongs to exactly one company code; using a plant
// from a different company on a PO line is a configuration error that SAP/JDE blocks.
//
// This module provides lookup helpers so generators produce consistent
// BUKRS→WERKS (SAP), KCOO→MCU (JDE) pairs instead of random cross-picks.
//
// D365 DataAreaId (legal entity) is already threaded through all scenario tables —
// no extra fix needed there.

const { faker } = require('@faker-js/faker');

// ── SAP ECC ──────────────────────────────────────────────────────────────────
// BUKRS → { plants: WERKS[], porg: EKORG[] }
const SAP_ORG = {
  '1000': { plants: ['1000','1100','1200'], porg: ['1000','1001'] },   // DE Manufacturing
  '2000': { plants: ['2000','2100'],        porg: ['2000','USPO'] },   // US Operations
  '3000': { plants: ['3000','3100'],        porg: ['3000','GBPO'] },   // UK Sales
  'GB01': { plants: ['GB01','GB02'],        porg: ['GBPO']        },   // GB Legal Entity
  'US01': { plants: ['US01','US02','US03'], porg: ['USPO','2000'] },   // US Legal Entity
  'IN01': { plants: ['IN01','IN02'],        porg: ['INDE']        },   // India Operations
};

// ── JDE E1 ───────────────────────────────────────────────────────────────────
// KCOO → MCU[] (company key → its branch-plant business units)
const JDE_ORG = {
  '00001': ['00001','M10','WH01'],
  '00002': ['00002','M20','WH02'],
  '10000': ['10000','M30','WH10','WH11'],
  '20000': ['20000','M40','WH20'],
};

// ── D365 F&O ─────────────────────────────────────────────────────────────────
// DataAreaId → InventSiteId[] (legal entity → its inventory sites)
const D365_ORG = {
  'USMF': ['US1','US2','US3'],
  'GBSI': ['GB1','GB2'],
  'FRRT': ['FR1'],
  'DEMF': ['DE1','DE2'],
  'INMF': ['IN1','IN2'],
  'SGMF': ['SG1'],
};

/**
 * Returns a valid WERKS for the given SAP company code (BUKRS).
 * Falls back to a cross-company plant if BUKRS is unrecognised (graceful degradation).
 */
function sapPlantForCompany(bukrs) {
  const org = SAP_ORG[bukrs];
  if (!org) return faker.helpers.arrayElement(['1000','2000','3000']);
  return faker.helpers.arrayElement(org.plants);
}

/**
 * Returns a valid EKORG for the given SAP company code (BUKRS).
 */
function sapPorgForCompany(bukrs) {
  const org = SAP_ORG[bukrs];
  if (!org) return faker.helpers.arrayElement(['1000','2000','GBPO']);
  return faker.helpers.arrayElement(org.porg);
}

/**
 * Returns a valid MCU (branch-plant) for the given JDE company key (KCOO).
 */
function jdeMcuForCompany(kcoo) {
  const units = JDE_ORG[kcoo];
  if (!units) return kcoo;
  return faker.helpers.arrayElement(units);
}

/**
 * Returns a valid InventSiteId for the given D365 legal entity (DataAreaId).
 */
function d365SiteForEntity(dataAreaId) {
  const sites = D365_ORG[dataAreaId];
  if (!sites) return 'US1';
  return faker.helpers.arrayElement(sites);
}

module.exports = {
  SAP_ORG, JDE_ORG, D365_ORG,
  sapPlantForCompany, sapPorgForCompany,
  jdeMcuForCompany, d365SiteForEntity,
};
