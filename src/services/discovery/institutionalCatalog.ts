// SCM Prospect Intelligence Platform - Enterprise Institutional Catalog
// Comprehensive dataset of Nigerian institutional prospects for SCM Capital Asset Management

import { CatalogCompany } from "./types";

export const INSTITUTIONAL_PROSPECT_CATALOG: CatalogCompany[] = [
  // ==========================================
  // 1. NGX LISTED CORPORATIONS & BLUE CHIP CONGLOMERATES
  // ==========================================
  {
    id: "cat-ngx-001",
    name: "MTN Nigeria Communications PLC",
    industry: "Telecommunications",
    size: "2,500+ employees",
    website: "mtn.ng",
    location: "Lagos (Ikoyi), Nigeria",
    source: "NGX Listed Corporations",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 120000000000,
    decisionMakers: [
      { name: "Ketan Patel", title: "Chief Financial Officer" },
      { name: "Group Treasurer", title: "Head of Treasury Operations" }
    ],
    latestNews: "Reporting ₦2.1 Trillion revenue — seeking institutional short-term liquidity & commercial paper placements.",
    description: "Leading mobile telecommunications provider in West Africa with substantial subscriber deposit floats."
  },
  {
    id: "cat-ngx-002",
    name: "Dangote Cement PLC",
    industry: "FMCG & Manufacturing",
    size: "22,000+ employees",
    website: "dangotecement.com",
    location: "Lagos (Victoria Island), Nigeria",
    source: "NGX Listed Corporations",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 150000000000,
    decisionMakers: [
      { name: "Group CFO", title: "Chief Financial Officer" },
      { name: "Treasury Manager", title: "Treasury Lead" }
    ],
    latestNews: "Expanding Pan-African clinker production — significant working capital and money market placement target.",
    description: "Largest cement manufacturer in Sub-Saharan Africa with mega treasury operations."
  },
  {
    id: "cat-ngx-003",
    name: "BUA Foods PLC",
    industry: "FMCG & Manufacturing",
    size: "4,500+ employees",
    website: "buafoods.com",
    location: "Lagos (VI), Nigeria",
    source: "FMCG & Consumer Goods Conglomerates",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 85000000000,
    decisionMakers: [
      { name: "Head of Finance", title: "Finance Director" },
      { name: "Corporate Treasurer", title: "Group Treasurer" }
    ],
    latestNews: "Unveils new flour milling capacity in Port Harcourt with ₦30B short-term cash reserve surplus.",
    description: "Integrated food conglomerate processing sugar, flour, pasta, rice, and edible oils."
  },
  {
    id: "cat-ngx-004",
    name: "Seplat Energy PLC",
    industry: "Oil & Gas / Energy",
    size: "1,100+ employees",
    website: "seplatenergy.com",
    location: "Lagos (Ikoyi), Nigeria",
    source: "Oil & Gas / Energy Upstream & Downstream",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 95000000000,
    decisionMakers: [
      { name: "Chief Financial Officer", title: "CFO & Executive Director" },
      { name: "Treasury Officer", title: "Group Corporate Finance" }
    ],
    latestNews: "Dual-listed energy powerhouse preparing ₦40B treasury optimization and CP series tranche.",
    description: "Leading indigenous Nigerian oil and gas exploration and production company listed on NGX and LSE."
  },
  {
    id: "cat-ngx-005",
    name: "Airtel Africa PLC",
    industry: "Telecommunications",
    size: "3,100+ employees",
    website: "airtel.africa",
    location: "Lagos (Ikoyi), Nigeria",
    source: "NGX Listed Corporations",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 110000000000,
    decisionMakers: [
      { name: "Jaideep Paul", title: "Chief Financial Officer" },
      { name: "Head of Treasury", title: "Group Treasurer" }
    ],
    latestNews: "Expanding 4G/5G mobile money float reserves across Nigerian operations.",
    description: "Major telecommunications operator with high daily liquidity turnover across West and Central Africa."
  },
  {
    id: "cat-ngx-006",
    name: "BUA Cement PLC",
    industry: "FMCG & Manufacturing",
    size: "8,000+ employees",
    website: "buacement.com",
    location: "Lagos (VI) & Sokoto, Nigeria",
    source: "NGX Listed Corporations",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 90000000000,
    decisionMakers: [
      { name: "CFO", title: "Chief Financial Officer" },
      { name: "Financial Controller", title: "Head of Treasury" }
    ],
    latestNews: "Commissioning new 3MTPA line in Sokoto, seeking short-term cash yield optimization.",
    description: "Second largest cement producer in Nigeria with substantial capital expenditure reserves."
  },
  {
    id: "cat-ngx-007",
    name: "Nestle Nigeria PLC",
    industry: "FMCG & Manufacturing",
    size: "2,800+ employees",
    website: "nestle-cwar.com",
    location: "Ilupeju, Lagos, Nigeria",
    source: "FMCG & Consumer Goods Conglomerates",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 75000000000,
    decisionMakers: [
      { name: "Finance Director", title: "CFO" },
      { name: "Corporate Treasurer", title: "Treasury Manager" }
    ],
    latestNews: "Expanding local raw material sourcing with ₦20B liquid working capital requirement.",
    description: "Premier multinational food and beverage manufacturing company in Nigeria."
  },
  {
    id: "cat-ngx-008",
    name: "Nigerian Breweries PLC",
    industry: "FMCG & Manufacturing",
    size: "3,200+ employees",
    website: "nbplc.com",
    location: "Iganmu, Lagos, Nigeria",
    source: "FMCG & Consumer Goods Conglomerates",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 80000000000,
    decisionMakers: [
      { name: "Finance Director", title: "Chief Financial Officer" },
      { name: "Treasury Controller", title: "Head of Treasury" }
    ],
    latestNews: "Issuing Commercial Paper series to optimize short-term seasonal liquidity.",
    description: "Pioneer brewing company in Nigeria operating multiple beverage manufacturing facilities."
  },
  {
    id: "cat-ngx-009",
    name: "Guaranty Trust Holding Company (GTCO)",
    industry: "Banking & Financial Services",
    size: "5,500+ employees",
    website: "gtholdco.com",
    location: "Lagos (Victoria Island), Nigeria",
    source: "CBN Regulated Commercial & Merchant Banks",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 140000000000,
    decisionMakers: [
      { name: "Group CFO", title: "Chief Financial Officer" },
      { name: "Head of ALCO", title: "Asset-Liability Management Lead" }
    ],
    latestNews: "Holding company restructure positioning HabariPay and asset management arms for institutional growth.",
    description: "Premier financial services holding company with extensive commercial banking and wealth operations."
  },
  {
    id: "cat-ngx-010",
    name: "Zenith Bank PLC",
    industry: "Banking & Financial Services",
    size: "7,200+ employees",
    website: "zenithbank.com",
    location: "Lagos (Victoria Island), Nigeria",
    source: "CBN Regulated Commercial & Merchant Banks",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 160000000000,
    decisionMakers: [
      { name: "Executive Director Finance", title: "CFO" },
      { name: "Treasury Head", title: "Head of Treasury & Trade" }
    ],
    latestNews: "Record Gross Earnings exceeding ₦2.1 Trillion — strong appetite for fixed income liquidity syndication.",
    description: "Tier-1 multinational financial service provider headquartered in Lagos."
  },

  // ==========================================
  // 2. COMMERCIAL & MERCHANT BANKS (CBN REGULATED)
  // ==========================================
  {
    id: "cat-bnk-001",
    name: "First City Monument Bank (FCMB Group PLC)",
    industry: "Banking & Financial Services",
    size: "3,800+ employees",
    website: "fcmb.com",
    location: "Lagos (Marina), Nigeria",
    source: "CBN Regulated Commercial & Merchant Banks",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 65000000000,
    decisionMakers: [
      { name: "Group CFO", title: "Chief Financial Officer" },
      { name: "Head of Asset Liability", title: "ALCO Chairman" }
    ],
    latestNews: "Strong capital adequacy ratio — seeking institutional co-investment & asset management mandates.",
    description: "Full-service banking group offering retail banking, corporate banking, and investment management."
  },
  {
    id: "cat-bnk-002",
    name: "Access Holdings PLC",
    industry: "Banking & Financial Services",
    size: "9,000+ employees",
    website: "theaccessbankgroup.com",
    location: "Lagos (Victoria Island), Nigeria",
    source: "CBN Regulated Commercial & Merchant Banks",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 180000000000,
    decisionMakers: [
      { name: "Group CFO", title: "Chief Financial Officer" },
      { name: "Head of Global Treasury", title: "Treasury Managing Director" }
    ],
    latestNews: "Expanding Pan-African banking footprint with ₦250B capital raising program.",
    description: "Largest commercial bank in Nigeria by asset size and customer base."
  },
  {
    id: "cat-bnk-003",
    name: "FBN Holdings PLC (FirstBank)",
    industry: "Banking & Financial Services",
    size: "8,500+ employees",
    website: "fbnholdings.com",
    location: "Lagos (Marina), Nigeria",
    source: "CBN Regulated Commercial & Merchant Banks",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 170000000000,
    decisionMakers: [
      { name: "Chief Financial Officer", title: "CFO" },
      { name: "Head of Treasury Operations", title: "Treasurer" }
    ],
    latestNews: "Celebrating 130 years of banking operations with major digital transformation and treasury expansion.",
    description: "Nigeria's premier financial services provider established in 1894."
  },
  {
    id: "cat-bnk-004",
    name: "United Bank for Africa PLC (UBA)",
    industry: "Banking & Financial Services",
    size: "10,000+ employees",
    website: "ubagroup.com",
    location: "Lagos (Marina), Nigeria",
    source: "CBN Regulated Commercial & Merchant Banks",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 155000000000,
    decisionMakers: [
      { name: "Group CFO", title: "Chief Financial Officer" },
      { name: "Group Treasurer", title: "Head of Treasury" }
    ],
    latestNews: "Pan-African operations driving record profit before tax across 20 African subsidiaries.",
    description: "Leading Pan-African financial institution operating in 20 African countries, NY, London, and Paris."
  },
  {
    id: "cat-bnk-005",
    name: "Coronation Merchant Bank",
    industry: "Banking & Financial Services",
    size: "350+ employees",
    website: "coronationmb.com",
    location: "Lagos (VI), Nigeria",
    source: "CBN Regulated Commercial & Merchant Banks",
    sizeTier: "Tier-2 Mid-Market (250 - 999 employees)",
    revenueRange: "₦10B - ₦100B High Liquidity",
    estimatedRevenueValue: 30000000000,
    decisionMakers: [
      { name: "Managing Director", title: "MD & CEO" },
      { name: "Head of Global Markets", title: "Treasurer" }
    ],
    latestNews: "Structuring institutional fixed income syndicates for infrastructure corporate issuers.",
    description: "Licensed merchant bank focused on corporate banking, investment banking, and global markets."
  },
  {
    id: "cat-bnk-006",
    name: "Nova Merchant Bank",
    industry: "Banking & Financial Services",
    size: "280+ employees",
    website: "novamb.com",
    location: "Lagos (VI), Nigeria",
    source: "CBN Regulated Commercial & Merchant Banks",
    sizeTier: "Tier-2 Mid-Market (250 - 999 employees)",
    revenueRange: "₦10B - ₦100B High Liquidity",
    estimatedRevenueValue: 28000000000,
    decisionMakers: [
      { name: "Chief Financial Officer", title: "CFO" },
      { name: "Head of Wholesale Banking", title: "Director" }
    ],
    latestNews: "Converting to commercial banking license to expand corporate treasury sweep capabilities.",
    description: "Merchant bank delivering wholesale banking and asset management solutions."
  },

  // ==========================================
  // 3. INSURANCE COMPANIES (NAICOM LICENSED)
  // ==========================================
  {
    id: "cat-ins-001",
    name: "AIICO Insurance PLC",
    industry: "Banking & Financial Services",
    size: "1,500+ employees",
    website: "aiicoplc.com",
    location: "Lagos (VI), Nigeria",
    source: "NAICOM Licensed Insurance Companies",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦10B - ₦100B High Liquidity",
    estimatedRevenueValue: 35000000000,
    decisionMakers: [
      { name: "Chief Investment Officer", title: "Head of Investment & Funds" },
      { name: "Chief Risk Officer", title: "CRO" }
    ],
    latestNews: "Expanding statutory reserve fund placements — prime candidate for SCM Corporate Money Market Fund.",
    description: "Leading insurance company providing life, general insurance, and health management solutions."
  },
  {
    id: "cat-ins-002",
    name: "Leadway Assurance Company Limited",
    industry: "Banking & Financial Services",
    size: "1,200+ employees",
    website: "leadway.com",
    location: "Lagos (Ipeju), Nigeria",
    source: "NAICOM Licensed Insurance Companies",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦10B - ₦100B High Liquidity",
    estimatedRevenueValue: 48000000000,
    decisionMakers: [
      { name: "Executive Director Investment", title: "CIO" },
      { name: "Head of Corporate Finance", title: "Finance Lead" }
    ],
    latestNews: "Maintaining largest insurance balance sheet in Nigeria with significant treasury deposit mandates.",
    description: "Premier non-life and life insurance underwriter with substantial investment portfolio."
  },
  {
    id: "cat-ins-003",
    name: "AXA Mansard Insurance PLC",
    industry: "Banking & Financial Services",
    size: "800+ employees",
    website: "axamansard.com",
    location: "Lagos (VI), Nigeria",
    source: "NAICOM Licensed Insurance Companies",
    sizeTier: "Tier-2 Mid-Market (250 - 999 employees)",
    revenueRange: "₦10B - ₦100B High Liquidity",
    estimatedRevenueValue: 40000000000,
    decisionMakers: [
      { name: "Chief Financial Officer", title: "CFO" },
      { name: "Head of Investments", title: "Portfolio Lead" }
    ],
    latestNews: "Surpassing ₦60B gross written premium, allocating high-yield money market reserves.",
    description: "Member of the AXA Group delivering composite insurance, health, and asset management."
  },
  {
    id: "cat-ins-004",
    name: "Custodian Investment PLC",
    industry: "Banking & Financial Services",
    size: "950+ employees",
    website: "custodiannigeria.com",
    location: "Lagos (Yaba), Nigeria",
    source: "NAICOM Licensed Insurance Companies",
    sizeTier: "Tier-2 Mid-Market (250 - 999 employees)",
    revenueRange: "₦10B - ₦100B High Liquidity",
    estimatedRevenueValue: 42000000000,
    decisionMakers: [
      { name: "Group CFO", title: "Chief Financial Officer" },
      { name: "Chief Investment Officer", title: "Head of Investments" }
    ],
    latestNews: "Investment holding group expanding life and property underwriting float placement.",
    description: "Investment holding company with interests in life, general insurance, and trusteeship."
  },

  // ==========================================
  // 4. PENSION FUND ADMINISTRATORS (PENCOM LICENSED)
  // ==========================================
  {
    id: "cat-pfa-001",
    name: "Stanbic IBTC Pension Managers",
    industry: "Banking & Financial Services",
    size: "850+ employees",
    website: "stanbicibtcpension.com",
    location: "Lagos (VI), Nigeria",
    source: "PenCom Licensed PFAs & Pension Funds",
    sizeTier: "Tier-2 Mid-Market (250 - 999 employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 110000000000,
    decisionMakers: [
      { name: "Chief Investment Officer", title: "Head of Portfolio Management" },
      { name: "Risk Manager", title: "Compliance Lead" }
    ],
    latestNews: "Managing over ₦4.5 Trillion in RSA assets — open to high-yield commercial paper placements and fixed income.",
    description: "Nigeria's largest Pension Fund Administrator by Assets under Management."
  },
  {
    id: "cat-pfa-002",
    name: "ARM Pension Managers Limited",
    industry: "Banking & Financial Services",
    size: "600+ employees",
    website: "armpension.com",
    location: "Lagos (Ikoyi), Nigeria",
    source: "PenCom Licensed PFAs & Pension Funds",
    sizeTier: "Tier-2 Mid-Market (250 - 999 employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 85000000000,
    decisionMakers: [
      { name: "Chief Investment Officer", title: "CIO" },
      { name: "Head of Fixed Income", title: "Portfolio Manager" }
    ],
    latestNews: "Expanding infrastructure bond and commercial paper asset allocation for Fund II and Fund III.",
    description: "Leading PFA with over ₦1 Trillion in pension assets under management."
  },
  {
    id: "cat-pfa-003",
    name: "Access Pensions Limited",
    industry: "Banking & Financial Services",
    size: "700+ employees",
    website: "accesspensions.ng",
    location: "Lagos (VI), Nigeria",
    source: "PenCom Licensed PFAs & Pension Funds",
    sizeTier: "Tier-2 Mid-Market (250 - 999 employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 95000000000,
    decisionMakers: [
      { name: "Chief Investment Officer", title: "Head of Investment" },
      { name: "Risk Officer", title: "Head of Risk Management" }
    ],
    latestNews: "Formed via merger of Sigma Pensions and First Guarantee Pension, reaching ₦1 Trillion AUM.",
    description: "Major PFA delivering retirement savings and fund management solutions."
  },
  {
    id: "cat-pfa-004",
    name: "Premium Pension Limited",
    industry: "Banking & Financial Services",
    size: "550+ employees",
    website: "premiumpension.com",
    location: "Abuja FCT, Nigeria",
    source: "PenCom Licensed PFAs & Pension Funds",
    sizeTier: "Tier-2 Mid-Market (250 - 999 employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 78000000000,
    decisionMakers: [
      { name: "Chief Investment Officer", title: "CIO" },
      { name: "Head of Portfolio", title: "Investment Lead" }
    ],
    latestNews: "Maintaining top-tier returns across RSA Funds I to IV with active corporate paper placements.",
    description: "Abuja-headquartered PFA managing over ₦1 Trillion in contributor assets."
  },

  // ==========================================
  // 5. ASSET MANAGERS & INVESTMENT BANKING
  // ==========================================
  {
    id: "cat-ast-001",
    name: "Chapel Hill Denham",
    industry: "Banking & Financial Services",
    size: "400+ employees",
    website: "chapelhilldenham.com",
    location: "Lagos (Ikoyi), Nigeria",
    source: "West Africa High-Growth Enterprise Register",
    sizeTier: "Tier-2 Mid-Market (250 - 999 employees)",
    revenueRange: "₦10B - ₦100B High Liquidity",
    estimatedRevenueValue: 55000000000,
    decisionMakers: [
      { name: "Bolaji Balogun", title: "Chief Executive Officer" },
      { name: "Head of Asset Management", title: "CIO" }
    ],
    latestNews: "Pioneering green infrastructure bond funds and corporate debt syndication.",
    description: "Leading independent investment banking and asset management firm in Nigeria."
  },
  {
    id: "cat-ast-002",
    name: "United Capital PLC",
    industry: "Banking & Financial Services",
    size: "450+ employees",
    website: "unitedcapitalplcgroup.com",
    location: "Lagos (VI), Nigeria",
    source: "West Africa High-Growth Enterprise Register",
    sizeTier: "Tier-2 Mid-Market (250 - 999 employees)",
    revenueRange: "₦10B - ₦100B High Liquidity",
    estimatedRevenueValue: 45000000000,
    decisionMakers: [
      { name: "Group CEO", title: "Managing Director" },
      { name: "Group CFO", title: "Chief Financial Officer" }
    ],
    latestNews: "Gross earnings increase by 45% driven by mutual fund asset growth and bond underwriting.",
    description: "Financial services group offering investment banking, asset management, and trusteeship."
  },
  {
    id: "cat-ast-003",
    name: "CardinalStone Partners Limited",
    industry: "Banking & Financial Services",
    size: "300+ employees",
    website: "cardinalstone.com",
    location: "Lagos (Ikoyi), Nigeria",
    source: "West Africa High-Growth Enterprise Register",
    sizeTier: "Tier-2 Mid-Market (250 - 999 employees)",
    revenueRange: "₦10B - ₦100B High Liquidity",
    estimatedRevenueValue: 32000000000,
    decisionMakers: [
      { name: "Head of Asset Management", title: "CIO" },
      { name: "Head of Investment Banking", title: "Director" }
    ],
    latestNews: "Expanding registrar and wealth management services for institutional clients.",
    description: "Full-service investment banking firm with security trading and asset management arms."
  },

  // ==========================================
  // 6. OIL & GAS / ENERGY UPSTREAM & DOWNSTREAM
  // ==========================================
  {
    id: "cat-oil-001",
    name: "Aiteo Eastern E&P Company",
    industry: "Oil & Gas / Energy",
    size: "800+ employees",
    website: "aiteogroup.com",
    location: "Lagos (Ikoyi) & Port Harcourt",
    source: "Oil & Gas / Energy Upstream & Downstream",
    sizeTier: "Tier-2 Mid-Market (250 - 999 employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 130000000000,
    decisionMakers: [
      { name: "Chief Financial Officer", title: "Group CFO" },
      { name: "Head of Treasury", title: "Treasury Manager" }
    ],
    latestNews: "OML 29 crude pipeline optimization generating major USD/NGN liquidity inflows.",
    description: "Indigenous oil exploration and production company operating major upstream concessions."
  },
  {
    id: "cat-oil-002",
    name: "Oando PLC",
    industry: "Oil & Gas / Energy",
    size: "1,400+ employees",
    website: "oandoplc.com",
    location: "Lagos (Victoria Island), Nigeria",
    source: "Oil & Gas / Energy Upstream & Downstream",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 140000000000,
    decisionMakers: [
      { name: "Wale Tinubu", title: "Group Chief Executive" },
      { name: "Adeola Oluuntoba", title: "Group CFO" }
    ],
    latestNews: "Acquisition of Eni's NAOC upstream assets expanding daily oil production capacity.",
    description: "Sub-Saharan Africa's leading indigenous energy solution provider."
  },
  {
    id: "cat-oil-003",
    name: "Sahara Group Limited",
    industry: "Oil & Gas / Energy",
    size: "4,000+ employees",
    website: "sahara-group.com",
    location: "Lagos (Ikoyi), Nigeria",
    source: "Oil & Gas / Energy Upstream & Downstream",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 190000000000,
    decisionMakers: [
      { name: "Executive Director Finance", title: "Group CFO" },
      { name: "Head of Energy Trading", title: "Treasury Lead" }
    ],
    latestNews: "Investing $1B in gas infrastructure across West Africa with active liquidity management.",
    description: "Leading international energy and infrastructure conglomerate."
  },
  {
    id: "cat-oil-004",
    name: "Aradel Holdings PLC (formerly NDPR)",
    industry: "Oil & Gas / Energy",
    size: "650+ employees",
    website: "aradelholdings.com",
    location: "Lagos (VI), Nigeria",
    source: "Oil & Gas / Energy Upstream & Downstream",
    sizeTier: "Tier-2 Mid-Market (250 - 999 employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 88000000000,
    decisionMakers: [
      { name: "Adegbite Falade", title: "MD / CEO" },
      { name: "CFO", title: "Chief Financial Officer" }
    ],
    latestNews: "Listing on NGX main board with robust cash dividend payout and liquidity surplus.",
    description: "Integrated energy company operating Ogbele field refinery and gas plant."
  },
  {
    id: "cat-oil-005",
    name: "Matrix Energy Group",
    industry: "Oil & Gas / Energy",
    size: "1,200+ employees",
    website: "matrixenergygroup.com",
    location: "Lagos (Ikoyi) & Warri, Nigeria",
    source: "Oil & Gas / Energy Upstream & Downstream",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 105000000000,
    decisionMakers: [
      { name: "Group Managing Director", title: "GMD" },
      { name: "Head of Corporate Finance", title: "CFO" }
    ],
    latestNews: "Expanding downstream petroleum depot and LPG vessel fleet operations.",
    description: "Fully integrated oil and gas marketing, supply, and trading company."
  },

  // ==========================================
  // 7. TECH & FINTECH ENTERPRISES
  // ==========================================
  {
    id: "cat-tch-001",
    name: "Interswitch Group",
    industry: "Tech & Fintech",
    size: "1,200+ employees",
    website: "interswitchgroup.com",
    location: "Lagos (Victoria Island), Nigeria",
    source: "West Africa High-Growth Enterprise Register",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦10B - ₦100B High Liquidity",
    estimatedRevenueValue: 45000000000,
    decisionMakers: [
      { name: "Chief Financial Officer", title: "CFO & VP Finance" },
      { name: "Head of Corporate Treasury", title: "Treasury Manager" }
    ],
    latestNews: "Processing over 12B annual digital transactions with substantial operating float awaiting yield optimization.",
    description: "Leading technology-driven company focused on digital payments and transaction switching."
  },
  {
    id: "cat-tch-002",
    name: "Flutterwave Technology Solutions",
    industry: "Tech & Fintech",
    size: "750+ employees",
    website: "flutterwave.com",
    location: "Lagos (Ikoyi), Nigeria",
    source: "West Africa High-Growth Enterprise Register",
    sizeTier: "Tier-2 Mid-Market (250 - 999 employees)",
    revenueRange: "₦10B - ₦100B High Liquidity",
    estimatedRevenueValue: 50000000000,
    decisionMakers: [
      { name: "Global CFO", title: "Chief Financial Officer" },
      { name: "Treasury Director", title: "Head of Corporate Treasury" }
    ],
    latestNews: "Enterprise payment gateway processing billions — seeking high-yield treasury management solutions.",
    description: "Global payments technology company connecting Africa to the world economy."
  },
  {
    id: "cat-tch-003",
    name: "Moniepoint Inc. (formerly TeamApt)",
    industry: "Tech & Fintech",
    size: "1,800+ employees",
    website: "moniepoint.com",
    location: "Lagos (Lexki), Nigeria",
    source: "West Africa High-Growth Enterprise Register",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦10B - ₦100B High Liquidity",
    estimatedRevenueValue: 60000000000,
    decisionMakers: [
      { name: "Tosin Eniolorunda", title: "Group CEO" },
      { name: "Head of Finance", title: "CFO" }
    ],
    latestNews: "Processing $12 Billion monthly payment volume for 2 million SMEs across Nigeria.",
    description: "Leading business payments and banking platform for African businesses."
  },
  {
    id: "cat-tch-004",
    name: "OPay Digital Services",
    industry: "Tech & Fintech",
    size: "2,100+ employees",
    website: "opayweb.com",
    location: "Lagos (Ikeja), Nigeria",
    source: "West Africa High-Growth Enterprise Register",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦10B - ₦100B High Liquidity",
    estimatedRevenueValue: 70000000000,
    decisionMakers: [
      { name: "President", title: "Country Director" },
      { name: "Chief Financial Officer", title: "CFO" }
    ],
    latestNews: "Surpassing 40 million registered users with high daily wallet deposit balance.",
    description: "Leading mobile money operator and agent banking network in West Africa."
  },
  {
    id: "cat-tch-005",
    name: "MainOne (an Equinix Company)",
    industry: "Telecommunications",
    size: "500+ employees",
    website: "mainone.net",
    location: "Lagos (VI), Nigeria",
    source: "West Africa High-Growth Enterprise Register",
    sizeTier: "Tier-2 Mid-Market (250 - 999 employees)",
    revenueRange: "₦10B - ₦100B High Liquidity",
    estimatedRevenueValue: 35000000000,
    decisionMakers: [
      { name: "Funke Opeke", title: "Regional Managing Director" },
      { name: "Head of Finance", title: "CFO West Africa" }
    ],
    latestNews: "Expanding hyperscale data center capacity in Lekki with Equinix investment.",
    description: "Premier digital infrastructure provider offering submarine cable and data center services."
  },

  // ==========================================
  // 8. CONSTRUCTION, INFRASTRUCTURE & REAL ESTATE
  // ==========================================
  {
    id: "cat-cst-001",
    name: "Julius Berger Nigeria PLC",
    industry: "Construction & Infrastructure",
    size: "15,000+ employees",
    website: "julius-berger.com",
    location: "Abuja FCT, Nigeria",
    source: "NGX Listed Corporations",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 70000000000,
    decisionMakers: [
      { name: "Financial Director", title: "Chief Financial Officer" },
      { name: "Cash Manager", title: "Head of Treasury" }
    ],
    latestNews: "Awarded major federal highway infrastructure contracts — ideal candidate for short term liquidity instruments.",
    description: "Leading civil engineering and construction company operating in Nigeria since 1965."
  },
  {
    id: "cat-cst-002",
    name: "Cappa & D'Alberto PLC",
    industry: "Construction & Infrastructure",
    size: "2,500+ employees",
    website: "capdal.com",
    location: "Lagos (VI), Nigeria",
    source: "NGX Listed Corporations",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦10B - ₦100B High Liquidity",
    estimatedRevenueValue: 28000000000,
    decisionMakers: [
      { name: "Managing Director", title: "MD" },
      { name: "Chief Accountant", title: "Finance Controller" }
    ],
    latestNews: "Executing commercial high-rise developments in Eko Atlantic and Ikoyi.",
    description: "Oldest building contractor in Nigeria specialized in high-grade civil engineering."
  },

  // ==========================================
  // 9. GOVERNMENT AGENCIES & PARASTATAILS
  // ==========================================
  {
    id: "cat-gov-001",
    name: "Federal Inland Revenue Service (FIRS)",
    industry: "Federal & State Government Agencies",
    size: "10,000+ employees",
    website: "firs.gov.ng",
    location: "Abuja FCT, Nigeria",
    source: "Federal & State Government Agencies / Parastatals",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 200000000000,
    decisionMakers: [
      { name: "Coordinating Director", title: "Director of Finance & Accounts" },
      { name: "Head of Investment", title: "Treasury Trustee" }
    ],
    latestNews: "Surpasses ₦12 Trillion tax collection goal — institutional funds management & treasury advisory candidate.",
    description: "Primary federal revenue collection agency for the Government of Nigeria."
  },
  {
    id: "cat-gov-002",
    name: "Nigerian Ports Authority (NPA)",
    industry: "Federal & State Government Agencies",
    size: "6,000+ employees",
    website: "nigerianports.gov.ng",
    location: "Lagos (Marina), Nigeria",
    source: "Federal & State Government Agencies / Parastatals",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 150000000000,
    decisionMakers: [
      { name: "Executive Director Finance", title: "ED Finance & Admin" },
      { name: "General Manager Finance", title: "GM Finance" }
    ],
    latestNews: "Modernizing Lekki Deep Sea Port tariffs generating strong revenue collection float.",
    description: "Federal agency governing and operating maritime ports across Nigeria."
  },
  {
    id: "cat-gov-003",
    name: "Nigerian Communications Commission (NCC)",
    industry: "Federal & State Government Agencies",
    size: "1,500+ employees",
    website: "ncc.gov.ng",
    location: "Abuja FCT, Nigeria",
    source: "Federal & State Government Agencies / Parastatals",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 120000000000,
    decisionMakers: [
      { name: "Executive Commissioner", title: "Stakeholder Management" },
      { name: "Director of Financial Services", title: "Director Finance" }
    ],
    latestNews: "Spectrum auction license fees generating major statutory fund surplus.",
    description: "Independent regulatory authority for the telecommunications industry in Nigeria."
  },

  // ==========================================
  // 10. AVIATION, TRANSPORT & LOGISTICS
  // ==========================================
  {
    id: "cat-av-001",
    name: "Air Peace Limited",
    industry: "Aviation & Logistics",
    size: "3,500+ employees",
    website: "flyairpeace.com",
    location: "Lagos (Ikeja), Nigeria",
    source: "West Africa High-Growth Enterprise Register",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦100B+ Mega Treasury Pool",
    estimatedRevenueValue: 95000000000,
    decisionMakers: [
      { name: "Allen Onyema", title: "Chairman / CEO" },
      { name: "Chief Financial Officer", title: "CFO" }
    ],
    latestNews: "Launch of direct Lagos-London Gatwick route expanding foreign currency cash inflows.",
    description: "West Africa's largest private airline operating domestic, regional, and international routes."
  },
  {
    id: "cat-av-002",
    name: "Red Star Express PLC (FedEx Licensee)",
    industry: "Aviation & Logistics",
    size: "1,800+ employees",
    website: "redstarexpress-ng.com",
    location: "Lagos (Murtala Muhammed Airport), Nigeria",
    source: "NGX Listed Corporations",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦10B - ₦100B High Liquidity",
    estimatedRevenueValue: 18000000000,
    decisionMakers: [
      { name: "Group Managing Director", title: "GMD / CEO" },
      { name: "Head of Finance", title: "CFO" }
    ],
    latestNews: "Expanding cold-chain agro-export logistics hub with liquid cash balances.",
    description: "Exclusive license holder for FedEx Express in Nigeria listed on the NGX."
  },

  // ==========================================
  // 11. EDUCATION & HEALTHCARE INSTITUTIONS
  // ==========================================
  {
    id: "cat-edu-001",
    name: "Covenant University Ota",
    industry: "Education & Institutions",
    size: "1,800+ employees",
    website: "covenantuniversity.edu.ng",
    location: "Ota, Ogun / Lagos Region",
    source: "NGOs, Educational & Healthcare Institutions",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦1B - ₦10B Growth Treasury",
    estimatedRevenueValue: 12000000000,
    decisionMakers: [
      { name: "Bursar", title: "Chief Financial Officer" },
      { name: "Director of Endowment", title: "Head of Investments" }
    ],
    latestNews: "Expansion of research endowment fund — direct candidate for SCM Private Wealth & Endowment Mandates.",
    description: "Top-ranked private research university in West Africa with substantial endowment assets."
  },
  {
    id: "cat-edu-002",
    name: "Babcock University",
    industry: "Education & Institutions",
    size: "1,500+ employees",
    website: "babcock.edu.ng",
    location: "Ilishan-Remo, Ogun State, Nigeria",
    source: "NGOs, Educational & Healthcare Institutions",
    sizeTier: "Tier-1 Enterprise (1,000+ employees)",
    revenueRange: "₦1B - ₦10B Growth Treasury",
    estimatedRevenueValue: 10000000000,
    decisionMakers: [
      { name: "VP Financial Affairs", title: "Bursar" },
      { name: "Investment Lead", title: "Head of Portfolio" }
    ],
    latestNews: "Establishing teaching hospital expansion fund seeking fixed yield money market placements.",
    description: "Leading private university operating acclaimed medical and business faculties."
  },
  {
    id: "cat-hlth-001",
    name: "Reddington Hospital Group",
    industry: "Healthcare & Pharma",
    size: "950+ employees",
    website: "reddingtonhospital.com",
    location: "Lagos (VI / Ikeja), Nigeria",
    source: "NGOs, Educational & Healthcare Institutions",
    sizeTier: "Tier-2 Mid-Market (250 - 999 employees)",
    revenueRange: "₦1B - ₦10B Growth Treasury",
    estimatedRevenueValue: 8500000000,
    decisionMakers: [
      { name: "Group Financial Controller", title: "CFO" },
      { name: "Managing Director", title: "Executive Director" }
    ],
    latestNews: "Unveiling specialized oncology wing — seeking treasury optimization & equipment lease funding.",
    description: "Premier tertiary healthcare provider operating modern specialist hospitals."
  },
  {
    id: "cat-hlth-002",
    name: "Evercare Hospital Lekki",
    industry: "Healthcare & Pharma",
    size: "600+ employees",
    website: "evercare.ng",
    location: "Lagos (Lekki Phase 1), Nigeria",
    source: "NGOs, Educational & Healthcare Institutions",
    sizeTier: "Tier-2 Mid-Market (250 - 999 employees)",
    revenueRange: "₦1B - ₦10B Growth Treasury",
    estimatedRevenueValue: 7500000000,
    decisionMakers: [
      { name: "Chief Financial Officer", title: "CFO" },
      { name: "Medical Director", title: "CEO" }
    ],
    latestNews: "Multi-specialty tertiary facility backed by TPG Growth Fund with steady medical fee float.",
    description: "165-bed purpose-built tertiary care hospital in Lekki."
  }
];
