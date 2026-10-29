import type { RequirementProfile } from '../lib/checker';
// VERIFIED 2026-10-29 from the official SSC notice PDF linked below.
// IMPORTANT CONFLICTS FOUND IN THE SAME NOTICE, preserved here rather than smoothed over:
// - Section 8.7 (main instructions): signature JPEG/JPG 10-20 KB, about 6.0 cm x 2.0 cm.
// - Annexure-III instructions: signature JPEG/JPG 10-20 KB, about 4.0 cm x 2.0 cm.
// Therefore dimensions are stored as approximate and the checker returns WARNING for dimensions, never a hard pass.
// - Photograph for this exam is a LIVE-CAMERA capture (section 8.4), not a file upload.
// - Application window 23.04.2026-14.05.2026 and exam Aug-Sep 2026: as of 2026-10-29 this cycle is CLOSED, so status is archived.
export const PROFILES: RequirementProfile[] = [
  {
    id: 'ssc-cht-2026-signature',
    organization: 'Staff Selection Commission (SSC)',
    examName: 'Combined Hindi Translators Examination, 2026',
    cycle: '2026',
    documentType: 'Signature',
    formats: ['jpeg', 'jpg'],
    minBytes: 10 * 1024,
    maxBytes: 20 * 1024,
    dimensions: 'about 6.0 cm x 2.0 cm in section 8.7; about 4.0 cm x 2.0 cm in Annexure-III (conflicting, approximate)',
    dimensionsExact: false,
    officialUrl: 'https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_cht_2026.pdf',
    noticeDate: '2026-04-23',
    lastVerified: '2026-10-29',
    effectiveFrom: '2026-04-23',
    effectiveTo: '2026-05-14',
    status: 'archived',
    notes: 'Blurred or miniature signatures are stated to be rejected summarily in the notice, except for candidates who opted for Aadhaar-based authentication. This tool cannot judge blur or authenticity. Do not use this archived profile for a new cycle without checking ssc.gov.in first.',
  },
  {
    id: 'ssc-cht-2026-photograph',
    organization: 'Staff Selection Commission (SSC)',
    examName: 'Combined Hindi Translators Examination, 2026',
    cycle: '2026',
    documentType: 'Photograph',
    formats: ['jpeg', 'jpg'],
    dimensionsExact: false,
    special: ['live-camera'],
    officialUrl: 'https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_cht_2026.pdf',
    noticeDate: '2026-04-23',
    lastVerified: '2026-10-29',
    effectiveFrom: '2026-04-23',
    effectiveTo: '2026-05-14',
    status: 'archived',
    notes: 'Section 8.4 requires the photograph to be captured live by the application module, facing the camera, with good light and a plain background, no cap, mask or glasses. No upload size is given for the photograph in section 8.4-8.6, so this tool does not invent one.',
  },
];
