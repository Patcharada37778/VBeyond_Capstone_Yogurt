// Mock data for the ARMS prototype. Dates are relative to the moment the demo
// data is first created, so expiry reminders and "recent" lists stay meaningful.
import { DEFAULT_PERMISSIONS } from '../utils/permissions';

export const daysFromNow = (n, hour = 10, min = 0) => {
  const x = new Date();
  x.setDate(x.getDate() + n);
  x.setHours(hour, min, 0, 0);
  return x.toISOString();
};

const AVATAR_COLORS = ['#1f4e52', '#2c6166', '#007d46', '#5b6b7a', '#8a5a2b', '#3b6f74', '#6a4c93', '#a0522d', '#2f6f9f', '#4d7c0f'];

export const TEAMS = [
  { id: 'T-ALP', name: 'Team Alpha', leadId: 'AG-1002', region: 'Bangkok — Sukhumvit corridor', focus: 'High-rise condominiums', createdAt: daysFromNow(-900) },
  { id: 'T-BRV', name: 'Team Bravo', leadId: 'AG-1010', region: 'Bangkok — Ratchada / Lat Phrao', focus: 'Mid-range condominiums', createdAt: daysFromNow(-820) },
  { id: 'T-CHA', name: 'Team Charlie', leadId: 'AG-1020', region: 'Bangna — Samut Prakan', focus: 'Townhomes & low-rise', createdAt: daysFromNow(-700) },
  { id: 'T-DLT', name: 'Team Delta', leadId: 'AG-1030', region: 'Pattaya — Chonburi', focus: 'Resort & investment units', createdAt: daysFromNow(-520) },
];

// [id, first, last, team, status, regDaysAgo, expiryInDays, gender]
const AGENT_ROWS = [
  ['AG-1001', 'Somchai', 'Prasertsuk', 'T-ALP', 'Active', 760, 25],
  ['AG-1002', 'Kanokwan', 'Thongdee', 'T-ALP', 'Active', 890, 210],
  ['AG-1003', 'Apinya', 'Saetang', 'T-ALP', 'Active', 410, 160],
  ['AG-1004', 'Tanakorn', 'Jaidee', 'T-ALP', 'Active', 300, 65],
  ['AG-1005', 'Pornthip', 'Wongchai', 'T-ALP', 'Suspended', 520, 120],
  ['AG-1006', 'Natthapong', 'Srisuk', 'T-ALP', 'Active', 95, 270],
  ['AG-1010', 'Wiroj', 'Thanakit', 'T-BRV', 'Active', 840, 300],
  ['AG-1011', 'Ratana', 'Kongsak', 'T-BRV', 'Active', 450, 25],
  ['AG-1012', 'Chaiwat', 'Boonyarit', 'T-BRV', 'Active', 380, 190],
  ['AG-1013', 'Siriwan', 'Phromma', 'T-BRV', 'Expired', 760, -12],
  ['AG-1014', 'Jakkrit', 'Ananta', 'T-BRV', 'Active', 220, 145],
  ['AG-1015', 'Malee', 'Charoenrat', 'T-BRV', 'Active', 130, 235],
  ['AG-1020', 'Siriporn', 'Kaewmanee', 'T-CHA', 'Active', 700, 175],
  ['AG-1021', 'Prasit', 'Rattanakul', 'T-CHA', 'Active', 600, 80],
  ['AG-1022', 'Duangjai', 'Sombat', 'T-CHA', 'Active', 340, 18],
  ['AG-1023', 'Teerapat', 'Khamwong', 'T-CHA', 'Resigned', 640, 30],
  ['AG-1024', 'Kannika', 'Inthara', 'T-CHA', 'Active', 180, 205],
  ['AG-1030', 'Anucha', 'Rattanapong', 'T-DLT', 'Active', 510, 250],
  ['AG-1031', 'Pimchanok', 'Sukjai', 'T-DLT', 'Active', 290, 55],
  ['AG-1032', 'Thanawat', 'Meesuk', 'T-DLT', 'Active', 260, 110],
  ['AG-1033', 'Wanida', 'Chantra', 'T-DLT', 'Expired', 800, -40],
  ['AG-1034', 'Kittisak', 'Paisan', 'T-DLT', 'Active', 75, 290],
  ['AG-1035', 'Orathai', 'Saelim', 'T-DLT', 'Active', 150, 215],
  ['AG-1040', 'Arthit', 'Somboon', null, 'Active', 6, 359],
];

const PROJECTS = ['Riverside Residence — Phase 2', 'Sukhumvit 77 Skyline', 'Lat Phrao Garden Condo', 'Bangna Park Townhome', 'Pattaya Bay Suites', 'Ratchada Central Loft'];
const DEAL_STAGES = ['Reservation', 'Contract Signed', 'Down Payment', 'Pending Transfer'];

function makeAgents() {
  return AGENT_ROWS.map(([id, first, last, teamId, status, regAgo, expIn], i) => {
    const email = `${first.toLowerCase()}.${last.toLowerCase().slice(0, 3)}@vbeyond-agent.co.th`;
    return {
      id,
      firstName: first,
      lastName: last,
      email,
      phone: `08${(1 + (i % 9))}-${String(234 + i * 37).padStart(3, '0')}-${String(1000 + i * 271).slice(-4)}`,
      lineId: `${first.toLowerCase()}.${id.slice(-2)}`,
      teamId,
      teamRole: id === 'AG-1003' ? 'Senior Agent' : 'Agent',
      reportsTo: teamId
        ? ['AG-1004', 'AG-1005', 'AG-1006'].includes(id) ? 'AG-1003' : TEAMS.find((team) => team.id === teamId)?.leadId || null
        : null,
      status,
      registeredAt: daysFromNow(-regAgo),
      membershipStart: daysFromNow(expIn - 365),
      membershipExpiry: daysFromNow(expIn),
      address: ['88/12 Sukhumvit Soi 39, Khlong Tan Nuea, Watthana, Bangkok 10110', '119 Ratchadaphisek Rd, Din Daeng, Bangkok 10400', '45/7 Moo 3, Bang Na-Trat Rd, Bang Phli, Samut Prakan 10540', '221/9 Moo 9, Pattaya Sai 2 Rd, Bang Lamung, Chonburi 20150'][i % 4],
      nationality: 'Thai',
      dob: `19${82 + (i % 15)}-0${1 + (i % 9)}-1${i % 9}`,
      experience: ['5+ years in condominium sales', '2 years with a property brokerage', '3 years in residential leasing', 'New to real estate, background in banking'][i % 4],
      occupation: 'Licensed Real Estate Agent',
      qualifications: ['Real Estate Broker Certificate (TREBA)', 'Bachelor of Business Administration', 'Property Valuation Short Course'][i % 3],
      licenseNo: `REB-${64000 + i * 113}`,
      avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
      photo: null,
      activated: true,
      migrated: false,
      onboardedAt: teamId ? daysFromNow(-regAgo + 3) : null,
      teamHistory: teamId ? [{ teamId, from: daysFromNow(-regAgo + 3), to: null, reason: 'Initial onboarding' }] : [],
      activity: [
        { at: daysFromNow(-regAgo), text: 'Agent account created after registration approval' },
        ...(teamId ? [{ at: daysFromNow(-regAgo + 3), text: `Onboarded to ${TEAMS.find((t) => t.id === teamId).name}` }] : []),
        ...(status === 'Suspended' ? [{ at: daysFromNow(-9), text: 'Status changed to Suspended — pending compliance review of a customer complaint' }] : []),
        ...(status === 'Expired' ? [{ at: daysFromNow(expIn), text: 'Membership expired — renewal not submitted' }] : []),
        ...(status === 'Resigned' ? [{ at: daysFromNow(-20), text: 'Status changed to Resigned — personal reasons' }] : []),
      ],
    };
  });
}

function makeDeals(agents) {
  const deals = [];
  let n = 1;
  agents.forEach((a, i) => {
    const count = a.status === 'Resigned' ? 2 : i % 4;
    for (let k = 0; k < count; k++) {
      deals.push({
        id: `DL-${String(5000 + n++)}`,
        agentId: a.id,
        project: PROJECTS[(i + k) % PROJECTS.length],
        unit: `${['A', 'B', 'C'][k % 3]}-${12 + i}${k}${(i * 3) % 10}`,
        value: 2_450_000 + ((i * 7 + k * 13) % 30) * 185_000,
        stage: DEAL_STAGES[(i + k) % DEAL_STAGES.length],
        flag: a.status === 'Resigned' ? 'Needs reassignment' : a.status === 'Suspended' ? 'Manager review' : null,
        createdAt: daysFromNow(-(10 + i * 3 + k * 5)),
      });
    }
  });
  return deals;
}


const COMM_RATES = [0.02, 0.025, 0.03];
function makeCommissions(agents) {
  const list = [];
  let n = 1;
  agents.filter((a) => !a.migrated && a.status !== 'Resigned').forEach((a, i) => {
    for (let m = 0; m < 12; m++) {
      const sales = (i * 7 + m * 3) % 4 === 0 ? 2 : (i + m) % 3 === 0 ? 0 : 1;
      for (let k = 0; k < sales; k++) {
        const daysAgo = m * 30 + ((i * 11 + k * 9) % 26) + 2;
        const saleValue = 2_600_000 + ((i * 13 + m * 5 + k * 17) % 28) * 210_000;
        const rate = COMM_RATES[(i + m + k) % 3];
        list.push({
          id: `CM-${String(7000 + n++)}`,
          agentId: a.id,
          project: PROJECTS[(i + m + k) % PROJECTS.length],
          unit: `${['A', 'B', 'C', 'D'][(m + k) % 4]}-${10 + ((i + m) % 30)}${(k + m) % 10}`,
          saleValue,
          rate,
          amount: Math.round(saleValue * rate),
          closedAt: daysFromNow(-daysAgo),
          status: daysAgo > 45 ? 'Paid' : daysAgo > 15 ? 'Processing' : 'Pending Transfer',
        });
      }
    }
  });
  return list;
}


// Read-only property catalogue (synced from the V-Beyond property system in production).
// Some listings have no images or missing fields so the placeholders can be shown.
const PROPERTIES = [
  ['P-101', 'Riverside Residence — Phase 2', '1 Bedroom River View', 'Condominium', 'Bangkok', 'Bang Phlat', 4_250_000, 1, 1, 35, 'Available', ['/properties/condo-teal.svg', '/properties/interior.svg'], 'Riverside units on high floors with an open view of the Chao Phraya. Walking distance to MRT Bang Phlat.'],
  ['P-102', 'Riverside Residence — Phase 2', '2 Bedroom Corner Suite', 'Condominium', 'Bangkok', 'Bang Phlat', 7_890_000, 2, 2, 62, 'Available', ['/properties/condo-teal.svg', '/properties/interior.svg'], 'Corner layout with two balconies, a separate kitchen and a river-facing living room.'],
  ['P-103', 'Sukhumvit 77 Skyline', 'Studio City View', 'Condominium', 'Bangkok', 'Suan Luang', 2_690_000, 0, 1, 26, 'Available', ['/properties/tower-green.svg'], 'Compact studio for first-time buyers and investors, 400 m from BTS On Nut.'],
  ['P-104', 'Sukhumvit 77 Skyline', '1 Bedroom Plus', 'Condominium', 'Bangkok', 'Suan Luang', 3_950_000, 1, 1, 38, 'Reserved', ['/properties/tower-green.svg', '/properties/interior.svg'], 'One bedroom with a flexible study corner. Rooftop pool and co-working lounge.'],
  ['P-105', 'Lat Phrao Garden Condo', '1 Bedroom Garden View', 'Condominium', 'Bangkok', 'Chatuchak', 3_350_000, 1, 1, 32, 'Available', [], 'Low-density building surrounded by a landscaped garden, near MRT Lat Phrao.'],
  ['P-106', 'Bangna Park Townhome', '3 Bedroom Townhome', 'Townhome', 'Samut Prakan', 'Bang Phli', 4_890_000, 3, 3, 145, 'Available', ['/properties/townhome.svg'], 'Three-storey townhome with two parking spaces, close to Mega Bangna and the international schools.'],
  ['P-107', 'Bangna Park Townhome', '4 Bedroom Corner Townhome', 'Townhome', 'Samut Prakan', 'Bang Phli', 6_450_000, 4, 4, 182, 'Available', ['/properties/townhome.svg'], 'Corner unit with a private side garden and a ground-floor bedroom for elderly family members.'],
  ['P-108', 'Pattaya Bay Suites', '1 Bedroom Sea View', 'Condominium', 'Chonburi', 'Bang Lamung', 3_790_000, 1, 1, 40, 'Available', ['/properties/condo-teal.svg'], 'Resort-style suite with sea views, managed rental programme available for investors.'],
  ['P-109', 'Pattaya Bay Suites', '2 Bedroom Penthouse', 'Condominium', 'Chonburi', 'Bang Lamung', 12_900_000, 2, 3, 118, 'Sold Out', [], 'Top-floor penthouse with a private terrace and plunge pool.'],
  ['P-110', 'Ratchada Central Loft', 'Duplex Loft', 'Condominium', 'Bangkok', 'Din Daeng', 5_450_000, 1, 2, null, 'Available', [], 'Double-height loft near MRT Thailand Cultural Centre. Unit size to be confirmed by the developer.'],
];
const makeProperties = () => PROPERTIES.map(([id, project, name, type, province, district, price, bedrooms, bathrooms, size, status, images, description], i) => ({
  id, project, name, type, province, district, price, bedrooms, bathrooms, size, status, images, description, listedAt: daysFromNow(-(5 + i * 9)),
}));

// Commission rules (BO-SC-01). Rate = base rate + tier bonus; the team lead split comes out of the agent's commission.
const COMMISSION_RULES = {
  baseRate: 2.0,
  tierPeriodMonths: 3,
  tiers: [
    { id: 'TR-1', name: 'Tier 1', minSales: 0, bonus: 0 },
    { id: 'TR-2', name: 'Tier 2', minSales: 15_000_000, bonus: 0.5 },
    { id: 'TR-3', name: 'Tier 3', minSales: 40_000_000, bonus: 1.0 },
  ],
  split: { type: 'percentage', value: 10 },
  updatedAt: daysFromNow(-20),
  updatedBy: 'Suchada Chaiyaporn',
};

export const ADMINS = [
  { id: 'ADM-02', name: 'Suchada Chaiyaporn', email: 'suchada.c@vbeyond.co.th', phone: '02-168-1002', role: 'agentManager', department: 'Agent Network Management', status: 'Active', createdAt: daysFromNow(-600), lastLogin: daysFromNow(0, 9, 5), avatarColor: '#8a5a2b' },
  { id: 'ADM-06', name: 'Kittipong Saengthong', email: 'kittipong.s@vbeyond.co.th', phone: '02-168-1006', role: 'agentManager', department: 'Agent Network Management', status: 'Active', createdAt: daysFromNow(-250), lastLogin: daysFromNow(-2, 14, 0), avatarColor: '#a0522d' },
];

const doc = (id, type, fileName, daysAgo, status = 'Pending', comment = '') => ({
  id, type, fileName, size: 180_000 + fileName.length * 9_000, uploadedAt: daysFromNow(-daysAgo, 11), status, comment,
  history: [{ at: daysFromNow(-daysAgo, 11), text: `Uploaded ${fileName}` }],
});

function app({ id, first, last, email, phone, daysAgo, status, reviewer = null, docs, extra = {} }) {
  const submittedAt = daysFromNow(-daysAgo, 9, 30);
  return {
    id,
    userKey: email.toLowerCase(),
    personal: { firstName: first, lastName: last, email, phone, dob: '1994-05-18', nationality: 'Thai', address: '59/14 Phahonyothin Rd, Chatuchak, Bangkok 10900' },
    professional: { experience: '2 years as a sales executive with a residential developer', occupation: 'Sales Executive', qualifications: 'Bachelor of Business Administration, Kasetsart University', referrer: '' },
    documents: docs,
    status,
    submittedAt,
    reviewer,
    referredBy: null,
    preferredTeamId: null,
    clarifications: [],
    agentId: null,
    decisionNote: '',
    timeline: [{ at: submittedAt, text: 'Application submitted', by: `${first} ${last}` }],
    ...extra,
  };
}

function makeApplications() {
  const list = [
    app({ id: 'APP-2026-0141', first: 'Supansa', last: 'Meechai', email: 'supansa.m@gmail.com', phone: '081-552-1934', daysAgo: 1, status: 'Pending Review',
      docs: [doc('D1', 'Identification document', 'national_id_supansa.pdf', 1), doc('D2', 'Professional certificate', 'treba_certificate.pdf', 1), doc('D3', 'Other supporting document', 'house_registration.jpg', 1)] }),
    app({ id: 'APP-2026-0140', first: 'Krit', last: 'Phanomwan', email: 'krit.phanom@outlook.com', phone: '089-114-7720', daysAgo: 2, status: 'Pending Review', reviewer: 'ADM-02',
      docs: [doc('D1', 'Identification document', 'id_card_krit.png', 2, 'Verified'), doc('D2', 'Professional certificate', 'broker_course_cert.pdf', 2)] }),
    app({ id: 'APP-2026-0139', first: 'Lalita', last: 'Suwan', email: 'lalita.suwan@gmail.com', phone: '086-430-2281', daysAgo: 4, status: 'Clarification Required', reviewer: 'ADM-02',
      docs: [doc('D1', 'Identification document', 'lalita_id_front.jpg', 4, 'Requires Replacement', 'Image is blurred — the ID number cannot be read.'), doc('D2', 'Professional certificate', 'lalita_certificate.pdf', 4, 'Verified')],
      extra: { clarifications: [{ id: 'CL-1', message: 'Please upload a clearer scan of your national ID card. The ID number and expiry date must be readable.', by: 'Suchada Chaiyaporn', at: daysFromNow(-3, 14), response: '', respondedAt: null }] } }),
    app({ id: 'APP-2026-0138', first: 'Phakphum', last: 'Yodsri', email: 'phakphum.y@gmail.com', phone: '092-771-3302', daysAgo: 5, status: 'Resubmitted', reviewer: 'ADM-06',
      docs: [doc('D1', 'Identification document', 'phakphum_id_v2.pdf', 1, 'Pending'), doc('D2', 'Professional certificate', 'real_estate_cert.pdf', 5, 'Verified')],
      extra: { clarifications: [{ id: 'CL-1', message: 'Your ID document has expired. Please upload a valid national ID card.', by: 'Kittipong Saengthong', at: daysFromNow(-3, 10), response: 'I renewed my ID card last week. The new copy is attached.', respondedAt: daysFromNow(-1, 16) }] } }),
    app({ id: 'APP-2026-0137', first: 'Narumon', last: 'Kitti', email: 'narumon.kitti@gmail.com', phone: '084-990-1175', daysAgo: 7, status: 'Pending Review',
      docs: [doc('D1', 'Identification document', 'narumon_idcard.pdf', 7), doc('D2', 'Professional certificate', 'narumon_cert.pdf', 7), doc('D3', 'Bank book', 'bookbank_scb.jpg', 7)] }),
    app({ id: 'APP-2026-0136', first: 'Arthit', last: 'Somboon', email: 'arthit.som@vbeyond-agent.co.th', phone: '080-445-0021', daysAgo: 9, status: 'Approved', reviewer: 'ADM-02',
      docs: [doc('D1', 'Identification document', 'arthit_id.pdf', 9, 'Verified'), doc('D2', 'Professional certificate', 'arthit_cert.pdf', 9, 'Verified')],
      extra: { agentId: 'AG-1040', decisionNote: 'All documents verified.' } }),
    app({ id: 'APP-2026-0135', first: 'Benjamas', last: 'Ruangsri', email: 'benjamas.r@hotmail.com', phone: '087-300-6612', daysAgo: 11, status: 'Rejected', reviewer: 'ADM-06',
      docs: [doc('D1', 'Identification document', 'benjamas_id.pdf', 11, 'Verified'), doc('D2', 'Professional certificate', 'certificate_scan.pdf', 11, 'Rejected', 'Certificate could not be verified with the issuing institute.')],
      extra: { decisionNote: 'Professional certificate could not be verified with the issuing institute.' } }),
    app({ id: 'APP-2026-0134', first: 'Sakda', last: 'Nimitr', email: 'sakda.nimitr@gmail.com', phone: '095-118-4420', daysAgo: 13, status: 'Approved', reviewer: 'ADM-02',
      docs: [doc('D1', 'Identification document', 'sakda_id.jpg', 13, 'Verified'), doc('D2', 'Professional certificate', 'sakda_treba.pdf', 13, 'Verified')],
      extra: { agentId: 'AG-1041', decisionNote: 'Approved — experienced broker.' } }),
    app({ id: 'APP-2026-0133', first: 'Chalida', last: 'Sripan', email: 'chalida.sp@gmail.com', phone: '083-662-0904', daysAgo: 16, status: 'Pending Review',
      docs: [doc('D1', 'Identification document', 'chalida_id.pdf', 16), doc('D2', 'Professional certificate', 'chalida_course.pdf', 16)] }),
    app({ id: 'APP-2026-0132', first: 'Nopparat', last: 'Thammasak', email: 'nopparat.t@gmail.com', phone: '082-210-7756', daysAgo: 20, status: 'Clarification Required', reviewer: 'ADM-06',
      docs: [doc('D1', 'Identification document', 'nopparat_id.pdf', 20, 'Verified'), doc('D2', 'Professional certificate', 'missing_page.pdf', 20, 'Requires Replacement', 'Page 2 of the certificate is missing.')],
      extra: { clarifications: [{ id: 'CL-1', message: 'The certificate is incomplete — page 2 is missing. Please upload the full certificate.', by: 'Kittipong Saengthong', at: daysFromNow(-18, 15), response: '', respondedAt: null }] } }),
    app({ id: 'APP-2026-0131', first: 'Thitima', last: 'Wongsa', email: 'thitima.w@gmail.com', phone: '091-447-2213', daysAgo: 24, status: 'Rejected', reviewer: 'ADM-02',
      docs: [doc('D1', 'Identification document', 'thitima_id.pdf', 24, 'Verified')],
      extra: { decisionNote: 'Applicant does not meet the minimum age requirement for licensed agents.' } }),
    app({ id: 'APP-2026-0130', first: 'Panupong', last: 'Chaisiri', email: 'panupong.c@gmail.com', phone: '094-552-8890', daysAgo: 28, status: 'Approved', reviewer: 'ADM-06',
      docs: [doc('D1', 'Identification document', 'panupong_id.pdf', 28, 'Verified'), doc('D2', 'Professional certificate', 'panupong_cert.pdf', 28, 'Verified')],
      extra: { agentId: 'AG-1006', decisionNote: 'Approved.' } }),
  ];
  return list;
}

// Approved applicant (Sakda) waiting for team onboarding — gives the Agent Manager something to onboard.
function pendingOnboardAgent() {
  return {
    id: 'AG-1041', firstName: 'Sakda', lastName: 'Nimitr', email: 'sakda.nimitr@gmail.com', phone: '095-118-4420', lineId: 'sakda.n',
    teamId: null, status: 'Active', registeredAt: daysFromNow(-12), membershipStart: daysFromNow(-12), membershipExpiry: daysFromNow(353),
    address: '77/3 Srinakarin Rd, Nong Bon, Prawet, Bangkok 10250', nationality: 'Thai', dob: '1988-11-02',
    experience: '6 years as an independent property broker', occupation: 'Property Broker', qualifications: 'Real Estate Broker Certificate (TREBA)',
    licenseNo: 'REB-65872', avatarColor: '#2f6f9f', photo: null, activated: true, migrated: false, onboardedAt: null, teamHistory: [],
    activity: [{ at: daysFromNow(-12), text: 'Agent account created after registration approval (APP-2026-0134)' }],
  };
}

const MIGRATED = [
  {
    id: 'AG-0877', firstName: 'Prasert', lastName: 'Wongsakul', email: 'prasert.w@vbeyond-agent.co.th', legacyId: 'LG-20417', phone: '081-903-4456', lineId: 'prasert.w',
    teamId: 'T-BRV', status: 'Active', registeredAt: daysFromNow(-1900), membershipStart: daysFromNow(-140), membershipExpiry: daysFromNow(225),
    address: '12 Soi Lat Phrao 101, Khlong Chan, Bang Kapi, Bangkok 10240', nationality: 'Thai', dob: '1979-03-14',
    experience: '12 years with VBEYOND (legacy agent system)', occupation: 'Senior Real Estate Agent', qualifications: 'Real Estate Broker Certificate (TREBA)',
    licenseNo: 'REB-51120', avatarColor: '#4d7c0f', photo: null, activated: false, migrated: true, onboardedAt: daysFromNow(-1890),
    teamHistory: [{ teamId: 'T-BRV', from: daysFromNow(-1890), to: null, reason: 'Migrated from legacy agent system' }],
    activity: [{ at: daysFromNow(-30), text: 'Account migrated from the legacy agent system (LG-20417)' }],
  },
  {
    id: 'AG-0912', firstName: 'Yupin', lastName: 'Chaiyasit', email: 'yupin.c@vbeyond-agent.co.th', legacyId: 'LG-20533', phone: '089-211-3380', lineId: 'yupin.c',
    teamId: 'T-CHA', status: 'Active', registeredAt: daysFromNow(-1500), membershipStart: daysFromNow(-60), membershipExpiry: daysFromNow(305),
    address: '301 Bang Na-Trat Rd, Bang Na, Bangkok 10260', nationality: 'Thai', dob: '1985-07-22',
    experience: '8 years with VBEYOND (legacy agent system)', occupation: 'Real Estate Agent', qualifications: 'Bachelor of Economics',
    licenseNo: 'REB-53407', avatarColor: '#6a4c93', photo: null, activated: false, migrated: true, onboardedAt: daysFromNow(-1490),
    teamHistory: [{ teamId: 'T-CHA', from: daysFromNow(-1490), to: null, reason: 'Migrated from legacy agent system' }],
    activity: [{ at: daysFromNow(-30), text: 'Account migrated from the legacy agent system (LG-20533)' }],
  },
];

const ANNOUNCEMENTS = [
  { id: 'AN-031', title: 'Q4 commission structure update for condominium projects', category: 'Policy', date: daysFromNow(-1), status: 'Published', author: 'Suchada Chaiyaporn',
    summary: 'Revised commission tiers for condominium sales take effect for reservations made from the first of next month.',
    body: 'From the first of next month, commission on condominium reservations will follow a three-tier structure based on quarterly closed volume.\n\nTier 1 (up to THB 15M): 2.0%\nTier 2 (THB 15M–40M): 2.5%\nTier 3 (above THB 40M): 3.0%\n\nDeals reserved before the effective date keep the existing rate. Team leads will receive a briefing pack on Monday. Questions can be raised with your Agent Manager.', readBy: [] },
  { id: 'AN-030', title: 'Riverside Residence Phase 2 — agent preview day', category: 'Project Launch', image: '/banners/riverside-phase2.svg', date: daysFromNow(-3), status: 'Published', author: 'Suchada Chaiyaporn',
    summary: 'Registered agents are invited to an exclusive preview of Phase 2 show units before the public launch.',
    body: 'Agents with Active membership are invited to the Phase 2 preview on Saturday from 10:00 to 15:00 at the Riverside sales gallery.\n\nThe session includes a walkthrough of the new 1- and 2-bedroom layouts, the launch price list, and the early-bird promotion for agent-referred buyers. Please confirm attendance with your team lead by Thursday.', readBy: ['agent:AG-1002'] },
  { id: 'AN-029', title: 'Mandatory PDPA refresher training', category: 'Training', date: daysFromNow(-6), status: 'Published', author: 'Suchada Chaiyaporn',
    summary: 'All agents must complete the 45-minute personal data protection refresher before the end of the month.',
    body: 'To stay compliant with the Personal Data Protection Act (PDPA), every agent must complete the online refresher module before the end of this month.\n\nThe module covers handling customer ID copies, sharing buyer information with banks, and secure use of messaging apps. Agents who do not complete the training may have membership renewal delayed.', readBy: ['agent:AG-1001'] },
  { id: 'AN-028', title: 'New ARMS agent portal is live', category: 'System', date: daysFromNow(-10), status: 'Published', author: 'Suchada Chaiyaporn',
    summary: 'The new Agent Relationship Management System replaces the legacy agent portal. Migrated agents must complete first sign-in.',
    body: 'The ARMS portal is now the single place to manage your profile, renewals and team information.\n\nAgents migrated from the legacy system should use "First sign-in for migrated agents" on the login page with their registered email or legacy agent ID. For help, email info@vbeyond.co.th.', readBy: ['agent:AG-1001', 'agent:AG-1002'] },
  { id: 'AN-027', title: 'Year-end top agent awards — nomination period', category: 'Event', image: '/banners/top-agent-awards.svg', date: daysFromNow(-15), status: 'Published', author: 'Suchada Chaiyaporn',
    summary: 'Team leads can nominate agents for the year-end awards until the 30th.',
    body: 'Nominations are open for Top Closer, Rising Star and Customer Excellence. Team leads may nominate up to two agents per category. Winners will be announced at the year-end gala.', readBy: [] },
  { id: 'AN-026', title: 'Office closure for public holiday', category: 'General', date: daysFromNow(-22), status: 'Archived', author: 'Suchada Chaiyaporn',
    summary: 'Head office and sales galleries will close for the public holiday. Online services stay available.',
    body: 'Head office and all sales galleries will be closed on the public holiday. The ARMS portal remains available. Urgent issues can be reported through the portal.', readBy: [] },
  { id: 'AN-032', title: 'Draft: Updated agent code of conduct', category: 'Policy', date: daysFromNow(0), status: 'Draft', author: 'Suchada Chaiyaporn',
    summary: 'Proposed updates to social media advertising rules for agents.',
    body: 'Agents may advertise VBEYOND projects on personal social media using approved creative only. Price claims must match the official price list.', readBy: [] },
];

const FAQS = [
  { id: 'FAQ-01', category: 'Registration', q: 'Who can apply to become a VBEYOND agent?', a: 'Anyone aged 20 or over with a valid Thai national ID or work permit can apply. A real estate qualification is preferred but not required — new agents complete our onboarding training.', published: true, updatedAt: daysFromNow(-40) },
  { id: 'FAQ-02', category: 'Registration', q: 'Which documents do I need to register?', a: 'A copy of your national ID card (or passport and work permit), any professional real estate certificates, and the first page of your bank book for commission payments.', published: true, updatedAt: daysFromNow(-40) },
  { id: 'FAQ-03', category: 'Registration', q: 'How long does application review take?', a: 'Most applications are reviewed within 3 business days. If our team needs more information, you will receive a clarification request in the portal.', published: true, updatedAt: daysFromNow(-25) },
  { id: 'FAQ-04', category: 'Documents', q: 'What file types can I upload?', a: 'PDF, JPG and PNG files up to 10 MB each. Make sure all text on ID documents is clearly readable.', published: true, updatedAt: daysFromNow(-25) },
  { id: 'FAQ-05', category: 'Documents', q: 'Can I change a document after submitting?', a: 'Yes. Open My Application and choose Edit Documents. Replacing a document sends your application back to the review queue.', published: true, updatedAt: daysFromNow(-12) },
  { id: 'FAQ-06', category: 'Membership', q: 'When should I renew my membership?', a: 'You can renew from 90 days before your membership expires. Renewal is free — you only need a completed PDPA refresher certificate.', published: true, updatedAt: daysFromNow(-12) },
  { id: 'FAQ-07', category: 'Membership', q: 'What happens if my membership expires?', a: 'Expired agents cannot reserve units or receive new leads. Existing deals are preserved and followed up by your team lead until you renew.', published: true, updatedAt: daysFromNow(-8) },
  { id: 'FAQ-08', category: 'Account', q: 'I was an agent in the old system. Do I need to register again?', a: 'No. Use "First sign-in for migrated agents" on the login page with your registered email or legacy agent ID.', published: true, updatedAt: daysFromNow(-10) },
  { id: 'FAQ-09', category: 'Commission', q: 'When are commissions paid?', a: 'Commissions are paid on the 25th of the month after the buyer completes the ownership transfer.', published: true, updatedAt: daysFromNow(-2) },
];





const RENEWALS = [
  { id: 'REN-0091', agentId: 'AG-1011', requestedAt: daysFromNow(-3, 11), period: '1 year', status: 'Pending Review',
    documents: [{ id: 'RD1', type: 'PDPA training certificate', fileName: 'pdpa_cert_ratana.pdf', uploadedAt: daysFromNow(-3, 11), status: 'Verified' }],
    infoRequest: null, rejectionReason: '', history: [{ at: daysFromNow(-3, 11), text: 'Renewal request submitted' }] },
  { id: 'REN-0090', agentId: 'AG-1022', requestedAt: daysFromNow(-2, 14), period: '1 year', status: 'Pending Review',
    documents: [{ id: 'RD1', type: 'PDPA training certificate', fileName: 'duangjai_pdpa.pdf', uploadedAt: daysFromNow(-2, 14), status: 'Pending' }],
    infoRequest: null, rejectionReason: '', history: [{ at: daysFromNow(-2, 14), text: 'Renewal request submitted' }] },
  { id: 'REN-0089', agentId: 'AG-1031', requestedAt: daysFromNow(-5, 9), period: '1 year', status: 'Pending Review',
    documents: [{ id: 'RD1', type: 'PDPA training certificate', fileName: 'pdpa_pimchanok.pdf', uploadedAt: daysFromNow(-5, 9), status: 'Verified' }],
    infoRequest: null, rejectionReason: '', history: [{ at: daysFromNow(-5, 9), text: 'Renewal request submitted' }] },
  { id: 'REN-0088', agentId: 'AG-1004', requestedAt: daysFromNow(-12, 13), period: '1 year', status: 'Approved',
    documents: [{ id: 'RD1', type: 'PDPA training certificate', fileName: 'tanakorn_pdpa.pdf', uploadedAt: daysFromNow(-12, 13), status: 'Verified' }],
    infoRequest: null, rejectionReason: '', history: [{ at: daysFromNow(-12, 13), text: 'Renewal request submitted' }, { at: daysFromNow(-9, 10), text: 'Renewal approved — membership extended by 1 year' }] },
  { id: 'REN-0087', agentId: 'AG-1013', requestedAt: daysFromNow(-20, 10), period: '1 year', status: 'Rejected',
    documents: [], infoRequest: null, rejectionReason: 'PDPA refresher training not completed and no supporting certificate provided.',
    history: [{ at: daysFromNow(-20, 10), text: 'Renewal request submitted' }, { at: daysFromNow(-16, 15), text: 'Renewal rejected' }] },
];

const TRANSFER_REQUESTS = [
  { id: 'TR-021', agentId: 'AG-1014', fromTeamId: 'T-BRV', toTeamId: 'T-ALP', requestedBy: 'AG-1010', reason: 'Agent relocated to the Sukhumvit area and wants to focus on high-rise projects.', requestedAt: daysFromNow(-2, 13), status: 'Pending' },
  { id: 'TR-020', agentId: 'AG-1032', fromTeamId: 'T-DLT', toTeamId: 'T-CHA', requestedBy: 'AG-1030', reason: 'Better fit for townhome portfolio in Bangna.', requestedAt: daysFromNow(-4, 10), status: 'Pending' },
];

function makeNotifications() {
  return [
    { id: 'N-2', to: ['allAgents'], category: 'Company announcements', title: 'New announcement: Q4 commission structure update', body: 'Revised commission tiers for condominium sales.', link: '/announcements?open=AN-031', at: daysFromNow(-1, 9), readBy: [] },
    { id: 'N-5', to: ['agent:AG-1002'], category: 'Team assignment', title: 'New team member: Natthapong Srisuk', body: 'Natthapong Srisuk (AG-1006) joined Team Alpha.', link: '/team/members?highlight=AG-1006', at: daysFromNow(-92), readBy: ['agent:AG-1002'] },
    { id: 'N-6', to: ['role:agentManager'], category: 'Registration updates', title: 'New application: Supansa Meechai', body: 'APP-2026-0141 is waiting for review.', link: '/applications/APP-2026-0141', at: daysFromNow(-1, 9), readBy: [] },
    { id: 'N-7', to: ['role:agentManager'], category: 'Registration updates', title: 'Application resubmitted: Phakphum Yodsri', body: 'APP-2026-0138 was resubmitted with a new ID document.', link: '/applications/APP-2026-0138', at: daysFromNow(-1, 16), readBy: [] },
    { id: 'N-8', to: ['role:agentManager'], category: 'Registration updates', title: 'Approved agent waiting for onboarding', body: 'Sakda Nimitr (AG-1041) has not been assigned to a team.', link: '/teams?tab=onboarding', at: daysFromNow(-12), readBy: [] },
    { id: 'N-9', to: ['role:agentManager'], category: 'Membership renewal reminders', title: 'Renewal request: Ratana Kongsak', body: 'REN-0091 is ready for review.', link: '/renewals', at: daysFromNow(-2, 16), readBy: [] },
    { id: 'N-13', to: ['applicant:nutnicha.rungroj@gmail.com'], category: 'Registration updates', title: 'Welcome to VBEYOND ARMS', body: 'Start your agent registration — it takes about 10 minutes.', link: '/register', at: daysFromNow(0, 8), readBy: [] },
  ];
}

function makeLogs() {
  const rows = [
    [-0.1, 'Suchada Chaiyaporn', 'Agent Manager', 'Signed in', 'ARMS back office'],
    [-0.2, 'Suchada Chaiyaporn', 'Agent Manager', 'Viewed application', 'APP-2026-0140'],
    [-1, 'Kittipong Saengthong', 'Agent Manager', 'Verified document', 'APP-2026-0140 / ID card'],
    [-2, 'Suchada Chaiyaporn', 'Agent Manager', 'Verified renewal documents', 'REN-0091'],
    [-5, 'Suchada Chaiyaporn', 'Agent Manager', 'Changed agent status', 'Pornthip Wongchai → Suspended'],
    [-7, 'Suchada Chaiyaporn', 'Agent Manager', 'Published FAQ', 'When should I renew my membership?'],
    [-9, 'Suchada Chaiyaporn', 'Agent Manager', 'Approved application', 'APP-2026-0136'],
  ];
  return rows.map(([d, actor, role, action, target], i) => ({ id: `LOG-${900 - i}`, at: daysFromNow(Math.floor(d), 9 + (i % 8), (i * 7) % 60), actor, role, action, target }));
}

export function createSeed() {
  const agents = [...makeAgents(), pendingOnboardAgent(), ...MIGRATED];
  return {
    version: 1,
    session: null,
    teams: TEAMS.map((t) => ({ ...t })),
    agents,
    deals: makeDeals(agents.filter((a) => !a.migrated)),
    commissions: makeCommissions(agents),
    admins: ADMINS.map((a) => ({ ...a })),
    properties: makeProperties(),
    favorites: { 'AG-1001': ['P-102', 'P-106'] },
    commissionRules: structuredClone(COMMISSION_RULES),
    salesUploads: [],
    applications: makeApplications(),
    announcements: ANNOUNCEMENTS,
    faqs: FAQS,
    renewals: RENEWALS,
    transferRequests: TRANSFER_REQUESTS,
    notifications: makeNotifications(),
    logs: makeLogs(),
    permissions: JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)),
    accounts: {}, // simulated passwords set through recovery / first login
    counters: { app: 142, agent: 1042, ticket: 1089, inv: 413, ren: 92, msg: 302, inq: 219, notif: 100, log: 1000, faq: 10, ann: 33, adm: 10, tr: 22, upload: 1 },
  };
}
