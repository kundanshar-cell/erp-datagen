// Procurement commodity catalogue
//
// Real PO lines have item descriptions, UOMs, and prices that are internally
// consistent with their commodity category. A faker.commerce.productName() like
// "Ergonomic Wooden Chair" can end up with UOM=KG and price=$0.50 — nonsense
// for a Yukti training set.
//
// This catalogue maps each category to:
//   - UNSPSC 8-digit code(s) — the universal procurement taxonomy
//   - Realistic item descriptions drawn from that category
//   - Appropriate UOMs (EA for hardware, KG for raw materials, HR for services…)
//   - Realistic price range (USD equivalent)
//   - ERP-specific codes: SAP MATKL, JDE SRP3, D365 ProcurementCategory
//
// Usage:
//   const { pickCommodity, randomItem, randomUom, randomPrice } = require('../utils/commodity');
//   const cat = pickCommodity();
//   const row = { description: randomItem(cat), uom: randomUom(cat), price: randomPrice(cat) };

const CATALOGUE = [
  {
    title:    'IT Hardware',
    unspsc:   ['43211500','43211600','43211700','43212100','43212200'],
    items: [
      'Laptop Computer 15"','Laptop Computer 14"','Desktop PC Workstation',
      'Server 2U Rack Unit','Network Switch 24-Port','UPS 1500VA Battery Backup',
      'Monitor 27" Full HD','Docking Station USB-C','Wireless Keyboard and Mouse Set',
      'External SSD 1TB','Network Attached Storage 4-Bay','Tablet 10" Corporate',
    ],
    uoms:     ['EA'],
    priceMin: 150,  priceMax: 8000,
    sapMatkl: 'IT01',
    jdeSrp:   'IT',
    d365Cat:  'IT Equipment',
  },
  {
    title:    'IT Software & Licenses',
    unspsc:   ['43232100','43232200','43232300','43233200'],
    items: [
      'Operating System License','Office Suite Annual License',
      'ERP User License (Annual)','Antivirus Software 10-User Pack',
      'Cloud Storage Subscription Annual','Database License Standard Edition',
      'CAD Design Software License','Project Management Platform (Annual)',
      'Password Manager Business 25 Users','Backup Software Annual License',
    ],
    uoms:     ['EA'],
    priceMin: 50,   priceMax: 50000,
    sapMatkl: 'IT02',
    jdeSrp:   'SW',
    d365Cat:  'IT Software',
  },
  {
    title:    'Office Supplies',
    unspsc:   ['44111500','44111600','44121600','44121700'],
    items: [
      'A4 Copy Paper 500-Sheet Ream','Ballpoint Pens Box of 50',
      'Lever Arch Files 10-Pack','Sticky Notes 76x76mm 12-Pack',
      'Printer Toner Cartridge Black','Stapler Desktop Heavy Duty',
      'Whiteboard Markers Set of 8','Envelopes DL Box of 500',
      'Manila Folders Box of 100','Correction Tape 5-Pack',
      'Scissors Stainless Steel','Hole Punch 2-4 Adjustable',
    ],
    uoms:     ['BX','EA','PK'],
    priceMin: 5,    priceMax: 250,
    sapMatkl: 'OFF',
    jdeSrp:   'OFF',
    d365Cat:  'Office Supplies',
  },
  {
    title:    'Office Furniture',
    unspsc:   ['56101500','56101600','56101700','56121500'],
    items: [
      'Ergonomic Office Chair with Lumbar Support','Height-Adjustable Standing Desk',
      '4-Drawer Filing Cabinet Steel','Bookcase 5-Shelf Adjustable',
      'Meeting Room Table 10-Person','Visitor Chair Stackable',
      'Adjustable Monitor Stand','Under-Desk Pedestal 3-Drawer',
      'Reception Desk L-Shape','Locker Bank 6-Door Steel',
      'Conference Chair Mesh Back','Whiteboard 1800x1200mm',
    ],
    uoms:     ['EA'],
    priceMin: 100,  priceMax: 3500,
    sapMatkl: 'FRN',
    jdeSrp:   'FRN',
    d365Cat:  'Office Furniture',
  },
  {
    title:    'MRO - Industrial',
    unspsc:   ['31161500','31161600','27111500','27112000'],
    items: [
      'Deep Groove Ball Bearing 6205-2RS','V-Belt Drive Set B Section',
      'Hydraulic Seal Repair Kit','Industrial Filter Element 10 Micron',
      'Gear Oil SAE 90 20L Drum','Pneumatic Push-In Fitting Kit',
      'Mild Steel Welding Rod 3.2mm Box','Cable Tie Assortment 300-Pack',
      'Cobalt HSS Drill Bit Set 19-Piece','Grinding Disc 115mm Box of 25',
      'O-Ring Kit Assorted 419-Piece','Chain Block 1 Tonne',
    ],
    uoms:     ['EA','BX','DRM','KG','SET'],
    priceMin: 10,   priceMax: 2500,
    sapMatkl: 'MRO',
    jdeSrp:   'MRO',
    d365Cat:  'Maintenance',
  },
  {
    title:    'Professional Services - IT',
    unspsc:   ['81111500','81111600','81111700','81112100'],
    items: [
      'IT Consulting Day Rate','Software Development Sprint Delivery',
      'System Integration Services','IT Programme Management',
      'Cybersecurity Penetration Test','Cloud Migration Project',
      'Data Analytics Consulting Engagement','Network Infrastructure Design',
      'ERP Implementation Support','Technical Architecture Review',
    ],
    uoms:     ['DAY','EA'],
    priceMin: 500,  priceMax: 30000,
    sapMatkl: 'SVC',
    jdeSrp:   'SVC',
    d365Cat:  'Services',
  },
  {
    title:    'Facilities Management',
    unspsc:   ['72101500','72101600','76111500','76111600'],
    items: [
      'Office Cleaning Contract Monthly','Building Maintenance Annual Contract',
      'HVAC Filter Replacement Service','Security Guard Services Weekly',
      'Commercial Waste Disposal Monthly','Pest Control Treatment Quarterly',
      'Janitorial Supplies Monthly Bundle','Car Park Management Monthly',
      'Lift Maintenance Annual Contract','Fire Alarm Service Annual',
    ],
    uoms:     ['EA','MO'],
    priceMin: 250,  priceMax: 25000,
    sapMatkl: 'SVC',
    jdeSrp:   'FAC',
    d365Cat:  'Facilities',
  },
  {
    title:    'Logistics & Freight',
    unspsc:   ['78101500','78101600','78102200','78102300'],
    items: [
      'Air Freight International per Shipment','Sea Freight FCL 20ft Container',
      'Road Haulage Full Truck Load','Express Courier Next Day',
      'Warehousing Monthly Storage Fee','Pallet Transport UK Mainland',
      'Temperature-Controlled Logistics','Last Mile Delivery Services',
      'Customs Clearance Agent Fee','Import Duty and Handling',
    ],
    uoms:     ['EA','KG','MO'],
    priceMin: 100,  priceMax: 60000,
    sapMatkl: 'SVC',
    jdeSrp:   'LOG',
    d365Cat:  'Logistics',
  },
  {
    title:    'Raw Materials - Metals',
    unspsc:   ['11101500','11101600','11101700','11102000'],
    items: [
      'Hot Rolled Steel Plate 10mm per Tonne','Cold Rolled Steel Coil per Tonne',
      'Aluminium Sheet 3mm per Sheet','Copper Wire 2.5mm² per 100m Coil',
      'Stainless Steel Bar 316L per Metre','Galvanised Steel Strip per Coil',
      'Structural Steel I-Beam 203x203','Brass Rod 20mm Diameter per Metre',
      'Steel Tube Circular Hollow Section','Mild Steel Round Bar 50mm per Metre',
    ],
    uoms:     ['MT','KG','EA','COI'],
    priceMin: 200,  priceMax: 120000,
    sapMatkl: 'ROH',
    jdeSrp:   'MAT',
    d365Cat:  'Raw Materials',
  },
  {
    title:    'Packaging Materials',
    unspsc:   ['24141500','24141600','24141700','24142000'],
    items: [
      'Double Wall Corrugated Boxes Pack 100','Large Bubble Wrap Roll 50m',
      'Clear Stretch Wrap Film 500m Roll','Polythene Bags Grip Seal per 1000',
      'Foam Packaging Sheet 2mm Roll','Brown Packing Tape 48mm 66m per 36',
      'Euro Pallets Treated EPAL per 10','Shrink Wrap Bags Assorted per 500',
      'Kraft Paper Roll 90gsm 300m','Void Fill Cushion Air System',
    ],
    uoms:     ['BX','ROL','EA','PK'],
    priceMin: 20,   priceMax: 6000,
    sapMatkl: 'PAK',
    jdeSrp:   'PKG',
    d365Cat:  'Packaging',
  },
  {
    title:    'Safety & PPE',
    unspsc:   ['46181500','46181600','46182200','46182300'],
    items: [
      'Safety Helmet EN397 White','Safety Boots Steel Toe Cap S3 SRC',
      'High Visibility Vest Class 2 5-Pack','Ear Defenders SNR 30dB',
      'Safety Goggles Indirect Vent EN166','CO2 Fire Extinguisher 5kg',
      'First Aid Kit BS8599-1 Medium Workplace','Full Body Fall Arrest Harness EN361',
      'FFP3 Fold-Flat Respirator Box 20','Chemical Spill Kit 20L Absorbent',
    ],
    uoms:     ['EA','BX','PK'],
    priceMin: 15,   priceMax: 1800,
    sapMatkl: 'PPE',
    jdeSrp:   'SAF',
    d365Cat:  'Safety',
  },
  {
    title:    'Laboratory Supplies',
    unspsc:   ['41111500','41111600','41121500','41121600'],
    items: [
      'Pipette Tips 1000µL Box of 96','Centrifuge Tubes 50mL Pack of 50',
      'Petri Dishes 90mm Pack of 20','Latex Examination Gloves Box 100',
      'pH 7.0 Buffer Solution 500mL','IPA Isopropanol 99.9% 2.5L',
      'Nitrile Powder-Free Gloves Box 100','Microscope Slides Ground Edge Box 72',
      'Graduated Measuring Cylinder 100mL','Lab Coat White Poly-Cotton Large',
    ],
    uoms:     ['BX','PK','EA'],
    priceMin: 10,   priceMax: 2500,
    sapMatkl: 'LAB',
    jdeSrp:   'LAB',
    d365Cat:  'Laboratory',
  },
  {
    title:    'Printing & Marketing',
    unspsc:   ['82111500','82111600','82121500','82121600'],
    items: [
      'A4 Full Colour Brochure Printing 1000 Copies','Pull-Up Banner Stand 85x200cm',
      'Business Cards Gloss 500 Copies','Branded USB Drives 8GB Pack of 50',
      'Modular Exhibition Stand 3x3m','Corporate Polo Shirts Embroidered per 12',
      'Annual Report Full Colour 250 Copies','DL Leaflet Printing 5000 Copies',
      'Vinyl Banner 3x1m Printed','Trade Show Table Cloth Branded',
    ],
    uoms:     ['EA','BX','PK'],
    priceMin: 50,   priceMax: 18000,
    sapMatkl: 'MKT',
    jdeSrp:   'MKT',
    d365Cat:  'Marketing',
  },
  {
    title:    'Catering & Hospitality',
    unspsc:   ['50171500','50171600','90101500','90101600'],
    items: [
      'Arabica Coffee Beans 1kg Pack of 6','Assorted Tea Bags Box of 200',
      'Mineral Water Still 500ml 24-Pack','Corporate Catering Service Daily',
      'Working Lunch Catering per Head','Vending Machine Consumables Refill',
      'Disposable Paper Cups 7oz Sleeve 50','Event Catering Equipment Hire Daily',
      'Office Fruit Bowl Weekly Delivery','Bottled Milk Delivery Weekly',
    ],
    uoms:     ['BX','EA','CS'],
    priceMin: 20,   priceMax: 6000,
    sapMatkl: 'CAT',
    jdeSrp:   'CAT',
    d365Cat:  'Catering',
  },
];

/**
 * Picks a random commodity category from the catalogue.
 * @returns {Object} - Commodity category object
 */
function pickCommodity() {
  return CATALOGUE[Math.floor(Math.random() * CATALOGUE.length)];
}

/**
 * Returns a random item description for the given category.
 */
function randomItem(cat) {
  return cat.items[Math.floor(Math.random() * cat.items.length)];
}

/**
 * Returns a random UOM appropriate for the given category.
 */
function randomUom(cat) {
  return cat.uoms[Math.floor(Math.random() * cat.uoms.length)];
}

/**
 * Returns a random unit price within the category's realistic price range.
 */
function randomPrice(cat) {
  const range = cat.priceMax - cat.priceMin;
  return parseFloat((cat.priceMin + Math.random() * range).toFixed(2));
}

/**
 * Returns a random UNSPSC code for the given category.
 */
function randomUnspsc(cat) {
  return cat.unspsc[Math.floor(Math.random() * cat.unspsc.length)];
}

module.exports = { CATALOGUE, pickCommodity, randomItem, randomUom, randomPrice, randomUnspsc };
