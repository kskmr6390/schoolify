'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock, RefreshCw,
  Newspaper, Bell, ChevronRight, Building2, BookOpen, Award, FileText,
  ClipboardList, ChevronDown, Filter, Search,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import api from '../../../lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────

type Priority  = 'high' | 'medium' | 'low'
type CertStatus = 'compliant' | 'in_progress' | 'action_required'
type Level     = 'basic' | 'intermediate' | 'advanced'
type Board     = 'all' | 'cbse' | 'icse' | 'ib' | 'state'
type ItemStatus = 'done' | 'pending' | 'na'

interface BreakdownItem  { key: string; label: string; score: number; weight: number; description: string }
interface Certification  { id: string; name: string; issuer: string; status: CertStatus; last_checked: string; description: string }
interface BoardReq       { id: string; area: string; requirement: string; threshold: number; unit: string; actual: number; score: number; passed: boolean; weight: number; lower_is_better?: boolean }
interface BoardData      { name: string; full_name: string; score: number; grade: string; requirements: BoardReq[] }
interface NewsItem       { id: string; title: string; category: string; date: string; priority: Priority; summary: string }
interface GovtNotif      { id: string; title: string; body: string; issuer: string; date: string; priority: Priority; ref: string }

interface CheckItem {
  id: string; title: string; description: string; category: string
  level: Level; boards: Board[]; mandatory: boolean; reference?: string
}

// ─── Master Checklist ────────────────────────────────────────────────────────

const CHECKLIST: CheckItem[] = [
  // ── Legal & Registration ──────────────────────────────────────────────────
  { id: 'l1',  title: 'Society / Trust Registration Certificate', description: 'Valid registration under Societies Registration Act 1860 or relevant state act. Must be renewed periodically.', category: 'Legal & Registration', level: 'basic', boards: ['all'], mandatory: true, reference: 'Societies Reg. Act 1860' },
  { id: 'l2',  title: 'NOC from State Government / Education Dept', description: "No Objection Certificate from the state government's education department before opening or continuing school operations.", category: 'Legal & Registration', level: 'basic', boards: ['all'], mandatory: true },
  { id: 'l3',  title: 'Land Ownership / Lease Documents', description: 'Registered ownership deed or valid long-term lease agreement (minimum 30 years for CBSE) for school premises.', category: 'Legal & Registration', level: 'basic', boards: ['cbse', 'icse', 'state'], mandatory: true, reference: 'CBSE Affiliation Bye-Laws 2018 §4' },
  { id: 'l4',  title: 'Building Completion & Occupancy Certificate', description: 'Certificate from municipal authority confirming building is structurally safe and approved for educational use.', category: 'Legal & Registration', level: 'basic', boards: ['all'], mandatory: true },
  { id: 'l5',  title: 'Fire Safety NOC from Fire Department', description: 'Annual NOC from the state fire department. Includes inspection of extinguishers, fire exits, smoke detectors, sprinklers.', category: 'Legal & Registration', level: 'basic', boards: ['all'], mandatory: true },
  { id: 'l6',  title: 'Affiliation / Recognition Certificate', description: 'Valid current affiliation/recognition certificate from CBSE/ICSE/IBO or state board. Must display prominently.', category: 'Legal & Registration', level: 'basic', boards: ['all'], mandatory: true },
  { id: 'l7',  title: 'Municipal Trade License / Registration', description: 'Business/trade license from local municipal body as applicable in the state.', category: 'Legal & Registration', level: 'basic', boards: ['all'], mandatory: false },
  { id: 'l8',  title: 'Environment Clearance (if applicable)', description: 'Environmental clearance from State Pollution Control Board for schools with >20,000 sqm built-up area or in eco-sensitive zones.', category: 'Legal & Registration', level: 'advanced', boards: ['all'], mandatory: false, reference: 'EIA Notification 2006' },

  // ── Staff Compliance ──────────────────────────────────────────────────────
  { id: 's1',  title: 'All Teachers Hold Valid B.Ed / D.El.Ed', description: 'Minimum teaching qualification as per RTE Act and NCTE norms. B.Ed for Classes 6–12; D.El.Ed or equivalent for primary.', category: 'Staff Compliance', level: 'basic', boards: ['all'], mandatory: true, reference: 'RTE Act 2009 §23; NCTE Reg. 2014' },
  { id: 's2',  title: 'Principal Holds M.Ed or Equivalent', description: 'Principal / Headmaster must hold M.Ed or postgraduate degree with B.Ed as per CBSE/ICSE norms.', category: 'Staff Compliance', level: 'basic', boards: ['cbse', 'icse'], mandatory: true, reference: 'CBSE Affiliation Bye-Laws §14' },
  { id: 's3',  title: 'Police Verification for All Staff', description: 'Background / police verification certificates obtained for all teaching and non-teaching staff before joining.', category: 'Staff Compliance', level: 'basic', boards: ['all'], mandatory: true, reference: 'POCSO Act 2012; MoE Advisory' },
  { id: 's4',  title: 'POCSO Awareness Training Completed', description: 'All staff (teaching and non-teaching) must complete POCSO awareness training. Records of completion maintained.', category: 'Staff Compliance', level: 'basic', boards: ['all'], mandatory: true, reference: 'POCSO Act 2012 §43' },
  { id: 's5',  title: 'Student-Teacher Ratio Within Board Norms', description: 'CBSE: max 30:1 (Sec), 40:1 (Primary). ICSE: max 25:1. State board norms as applicable.', category: 'Staff Compliance', level: 'basic', boards: ['all'], mandatory: true, reference: 'RTE Act §25; CBSE Bye-Laws §14' },
  { id: 's6',  title: 'Service Books Maintained for All Staff', description: 'Individual service records / service books maintained and updated annually for all permanent employees.', category: 'Staff Compliance', level: 'intermediate', boards: ['all'], mandatory: true },
  { id: 's7',  title: 'PF / ESI Contributions Filed Regularly', description: 'Provident Fund (EPF) and ESI contributions deposited monthly. ECR challan records maintained. Applicable if >10 employees.', category: 'Staff Compliance', level: 'intermediate', boards: ['all'], mandatory: true, reference: 'EPF Act 1952; ESI Act 1948' },
  { id: 's8',  title: 'TDS Deducted & Filed for Salaries (TDS 192)', description: 'TDS on salaries deducted and deposited monthly. Quarterly TDS returns (Form 24Q) filed. Form 16 issued annually.', category: 'Staff Compliance', level: 'intermediate', boards: ['all'], mandatory: true, reference: 'Income Tax Act §192' },
  { id: 's9',  title: 'Teacher Registration on State / National Portal', description: 'All teachers registered on UDISE+, Shiksha Paras (CBSE), or state teacher registration portal as required.', category: 'Staff Compliance', level: 'intermediate', boards: ['cbse', 'state'], mandatory: false },
  { id: 's10', title: 'Annual Performance Appraisal System in Place', description: 'Documented annual appraisal process for all teaching and administrative staff.', category: 'Staff Compliance', level: 'intermediate', boards: ['all'], mandatory: false },
  { id: 's11', title: 'Minimum 50 Hours CPD per Teacher per Year', description: 'Continuous Professional Development — NCTE mandates minimum 50 CPD hours per teacher annually. Records maintained.', category: 'Staff Compliance', level: 'advanced', boards: ['all'], mandatory: true, reference: 'NCTE Reg. 2021; NEP 2020 §5.16' },
  { id: 's12', title: 'Staff Medical Fitness Certificates', description: 'Annual medical fitness certificates for all food handlers, PE teachers, and lab staff.', category: 'Staff Compliance', level: 'advanced', boards: ['all'], mandatory: false },
  { id: 's13', title: 'POSH Committee (ICC) Constituted', description: 'Internal Complaints Committee (ICC) under POSH Act 2013 constituted with female majority. Annual report filed.', category: 'Staff Compliance', level: 'intermediate', boards: ['all'], mandatory: true, reference: 'POSH Act 2013 §4' },

  // ── Student Compliance ────────────────────────────────────────────────────
  { id: 'st1', title: 'Admission Registers Maintained (Form 1)', description: 'Complete admission register with student details, date of birth proof, address, parent details. Maintained as permanent record.', category: 'Student Records', level: 'basic', boards: ['all'], mandatory: true },
  { id: 'st2', title: 'Age Proof Verified for All Admissions', description: 'Birth certificate or municipal record for all students at time of admission. No underage admissions per RTE norms.', category: 'Student Records', level: 'basic', boards: ['all'], mandatory: true, reference: 'RTE Act 2009 §14' },
  { id: 'st3', title: 'Transfer Certificates from Previous School', description: 'Transfer certificates collected and countersigned for all students transferring from another school.', category: 'Student Records', level: 'basic', boards: ['all'], mandatory: true },
  { id: 'st4', title: 'Student Health Records & Annual Health Check', description: 'Annual medical check-up conducted for all students. Height, weight, vision, dental records maintained.', category: 'Student Records', level: 'basic', boards: ['all'], mandatory: true, reference: 'School Health Programme' },
  { id: 'st5', title: 'RTE 25% EWS / Disadvantaged Seats Filled', description: 'Minimum 25% of Class 1 seats reserved for EWS and disadvantaged groups. Free education provided. Reimbursement claimed from state.', category: 'Student Records', level: 'basic', boards: ['state', 'cbse'], mandatory: true, reference: 'RTE Act 2009 §12(1)(c)' },
  { id: 'st6', title: 'Student Aadhaar Linked in School Records', description: 'Students\' Aadhaar numbers collected and linked in school management system / UDISE+ portal for govt scheme benefits.', category: 'Student Records', level: 'intermediate', boards: ['all'], mandatory: false },
  { id: 'st7', title: 'CWSN Students Accommodated with IEP', description: 'Students with special needs identified. Individualized Education Plans prepared. Accessibility facilities provided as per RPWD Act 2016.', category: 'Student Records', level: 'intermediate', boards: ['all'], mandatory: true, reference: 'RPWD Act 2016 §16' },
  { id: 'st8', title: 'Student Accident Insurance in Place', description: 'Group accident insurance policy for all students. Policy document displayed. Claim process communicated to parents.', category: 'Student Records', level: 'intermediate', boards: ['all'], mandatory: false },
  { id: 'st9', title: 'SC/ST/OBC Scholarship Applications Supported', description: 'School facilitates NSP (National Scholarship Portal) applications for eligible SC/ST/OBC/Minority students annually.', category: 'Student Records', level: 'intermediate', boards: ['all'], mandatory: false },
  { id: 'st10',title: 'Student Grievance Redressal Mechanism', description: 'Formal grievance redressal process for students and parents. Complaint register maintained. Timelines followed.', category: 'Student Records', level: 'advanced', boards: ['all'], mandatory: false },

  // ── Academic Compliance ───────────────────────────────────────────────────
  { id: 'a1',  title: 'Annual Academic Calendar Prepared & Displayed', description: 'Academic calendar with term dates, holidays, exams, events approved by principal and displayed for parents and students.', category: 'Academic', level: 'basic', boards: ['all'], mandatory: true },
  { id: 'a2',  title: 'Minimum Working Days Met', description: 'CBSE: 220 days/year. ICSE: 200 days. IB: 180+ days. State board: as notified. Records maintained in log book.', category: 'Academic', level: 'basic', boards: ['all'], mandatory: true, reference: 'CBSE Circular ACAD-48/2024' },
  { id: 'a3',  title: 'Board-Approved Textbooks in Use', description: 'NCERT textbooks used for CBSE. ICSE Council approved texts. IBO published material for IB. No unauthorised books as primary texts.', category: 'Academic', level: 'basic', boards: ['cbse', 'icse', 'ib'], mandatory: true },
  { id: 'a4',  title: 'Lesson Plans Maintained by All Teachers', description: 'Daily/weekly lesson plans prepared by all teachers. Plans aligned with board syllabus. Reviewed by HODs periodically.', category: 'Academic', level: 'basic', boards: ['all'], mandatory: true },
  { id: 'a5',  title: 'Continuous Assessment Records Up-to-Date', description: 'CCE / Internal assessment marks recorded, totalled and entered in board portal before deadline. No gaps in records.', category: 'Academic', level: 'basic', boards: ['cbse', 'icse'], mandatory: true, reference: 'CBSE Assessment Norms 2024' },
  { id: 'a6',  title: 'Board Exam Registration Completed on Time', description: 'All eligible students registered for board examinations (Class 10/12 for CBSE; ICSE/ISC for CISCE) before deadline.', category: 'Academic', level: 'basic', boards: ['cbse', 'icse'], mandatory: true },
  { id: 'a7',  title: 'Syllabus Completion Tracking in Place', description: 'Subject-wise syllabus completion tracked monthly. Completion report submitted to principal. Remedial plan for gaps.', category: 'Academic', level: 'intermediate', boards: ['all'], mandatory: true },
  { id: 'a8',  title: 'Remedial / Support Classes for Weak Students', description: 'Structured remedial programme for students scoring below 40% in periodic assessments. Parent informed.', category: 'Academic', level: 'intermediate', boards: ['all'], mandatory: false },
  { id: 'a9',  title: 'Co-Curricular Activity Records Maintained', description: 'Participation in sports, arts, cultural events documented. Certificates, achievements recorded per student.', category: 'Academic', level: 'intermediate', boards: ['all'], mandatory: false },
  { id: 'a10', title: 'Library Catalogue Updated & Accessible', description: 'Minimum 1500 books for CBSE. Separate section for reference, fiction, periodicals. Catalogue updated annually.', category: 'Academic', level: 'intermediate', boards: ['cbse', 'icse'], mandatory: true, reference: 'CBSE Bye-Laws §10.4' },
  { id: 'a11', title: 'NEP 2020 Implementation Plan Documented', description: 'School has documented plan for NEP 2020 alignment: FLN goals, competency-based grading, vocational education, multilingual approach.', category: 'Academic', level: 'advanced', boards: ['cbse', 'state'], mandatory: false, reference: 'NEP 2020; NIPUN Bharat 2021' },
  { id: 'a12', title: 'IB Assessment Portfolio & CAS Records (IB only)', description: 'Internal Assessment portfolios, EE, TOK, and CAS hour logs maintained for each Diploma Programme student.', category: 'Academic', level: 'advanced', boards: ['ib'], mandatory: true, reference: 'IBO Programme Standards 2023' },
  { id: 'a13', title: 'Mock / Pre-Board Examinations Conducted', description: 'Minimum one full mock examination conducted for board classes. Answer scripts evaluated and returned with feedback.', category: 'Academic', level: 'intermediate', boards: ['cbse', 'icse'], mandatory: false },

  // ── Infrastructure ────────────────────────────────────────────────────────
  { id: 'i1',  title: 'Minimum Classroom Area Per Student', description: 'RTE norm: 1 sq.m per student. CBSE: minimum 8 sq.m per classroom. Classrooms well-lit and ventilated.', category: 'Infrastructure', level: 'basic', boards: ['all'], mandatory: true, reference: 'RTE Act Schedule; CBSE Bye-Laws §8' },
  { id: 'i2',  title: 'Separate Toilets for Boys, Girls & Staff', description: 'Functional, clean, separate toilet blocks for boys, girls, and staff. Ratio: 1 toilet per 50 boys (urinal+WC), 1 per 35 girls.', category: 'Infrastructure', level: 'basic', boards: ['all'], mandatory: true, reference: 'RTE Act 2009 Schedule §3' },
  { id: 'i3',  title: 'Safe Drinking Water (Filtered / RO) Available', description: 'Potable drinking water available through RO/filtration system. Water quality tested annually. Sufficient access points per student count.', category: 'Infrastructure', level: 'basic', boards: ['all'], mandatory: true },
  { id: 'i4',  title: 'First Aid Kit & Trained Staff on Premises', description: 'Well-stocked first aid kits on every floor. At least 2 staff trained in First Aid/CPR. Local hospital contact displayed.', category: 'Infrastructure', level: 'basic', boards: ['all'], mandatory: true },
  { id: 'i5',  title: 'Boundary Wall / Security Fence in Place', description: 'Compound wall or secure fence around entire school campus. Security guard at main gate. Visitor log maintained.', category: 'Infrastructure', level: 'basic', boards: ['cbse', 'icse', 'state'], mandatory: true, reference: 'CBSE Bye-Laws §8.2' },
  { id: 'i6',  title: 'Sports Ground / Play Area Available', description: 'Minimum 1500 sq.m playground for schools up to Class 8 (CBSE). Equipped for at least 2 outdoor sports.', category: 'Infrastructure', level: 'basic', boards: ['cbse', 'icse'], mandatory: true, reference: 'CBSE Bye-Laws §8.4' },
  { id: 'i7',  title: 'Science Laboratory with Safety Equipment', description: 'Separate physics, chemistry, biology labs (Classes 9+). Fire extinguisher, eye wash, exhaust fan, safety goggles mandatory.', category: 'Infrastructure', level: 'intermediate', boards: ['cbse', 'icse', 'ib'], mandatory: true, reference: 'CBSE Bye-Laws §10.2' },
  { id: 'i8',  title: 'Computer Lab with Internet Access', description: 'Functional computer lab with minimum 1 computer per 20 students. Broadband internet. Updated antivirus. Safe browsing enforced.', category: 'Infrastructure', level: 'intermediate', boards: ['cbse', 'icse', 'ib'], mandatory: true },
  { id: 'i9',  title: 'Disability-Friendly Infrastructure (RPWD Act)', description: 'Ramps at entrances, accessible toilets, tactile paths, Braille signage. Compliance audit under RPWD Act 2016 completed.', category: 'Infrastructure', level: 'intermediate', boards: ['all'], mandatory: true, reference: 'RPWD Act 2016 §16; Schedule' },
  { id: 'i10', title: 'CCTV Coverage at Entry, Exit & Corridors', description: 'CCTV cameras at all entry/exit points, corridors, and common areas. 30-day footage retention. Monitored by designated staff.', category: 'Infrastructure', level: 'intermediate', boards: ['all'], mandatory: false },
  { id: 'i11', title: 'Smart Classrooms / Digital Boards (min. 20%)', description: 'At least 20% classrooms equipped with interactive boards/projectors for digital learning as per NEP 2020 digital thrust.', category: 'Infrastructure', level: 'advanced', boards: ['cbse', 'ib'], mandatory: false },
  { id: 'i12', title: 'Solar / Renewable Energy Installation', description: 'Solar panels or renewable energy source installed. Reduces electricity bills and qualifies for Green School certification.', category: 'Infrastructure', level: 'advanced', boards: ['all'], mandatory: false },
  { id: 'i13', title: 'Rainwater Harvesting System', description: 'Functional rainwater harvesting system as per MoEFCC guidelines and state environmental norms.', category: 'Infrastructure', level: 'advanced', boards: ['all'], mandatory: false },
  { id: 'i14', title: 'Auditorium / Multi-Purpose Hall', description: 'Covered hall for assemblies, events, examinations. Seating capacity ≥ 25% of total students. Sound system available.', category: 'Infrastructure', level: 'advanced', boards: ['cbse', 'icse'], mandatory: false, reference: 'CBSE Bye-Laws §8.5' },

  // ── Financial Compliance ──────────────────────────────────────────────────
  { id: 'f1',  title: 'Fee Structure Displayed Publicly', description: 'Complete fee structure (tuition, transport, activity fees) displayed on school notice board and website. No hidden charges.', category: 'Financial', level: 'basic', boards: ['all'], mandatory: true, reference: 'State Fee Regulation Acts' },
  { id: 'f2',  title: 'Fee Receipts Issued for All Payments', description: 'Numbered receipts issued for every fee payment. Digital receipts accepted. Duplicate receipts available on request.', category: 'Financial', level: 'basic', boards: ['all'], mandatory: true },
  { id: 'f3',  title: 'Annual Accounts Audited by CA', description: 'Annual financial statements audited by a qualified Chartered Accountant. Audit report submitted with affiliation renewal.', category: 'Financial', level: 'basic', boards: ['cbse', 'icse'], mandatory: true, reference: 'CBSE Bye-Laws §14.2' },
  { id: 'f4',  title: 'School Bank Account (Non-Personal)', description: 'All school transactions through a registered institutional bank account. No transactions through personal accounts of staff.', category: 'Financial', level: 'basic', boards: ['all'], mandatory: true },
  { id: 'f5',  title: 'State Fee Regulation Act Compliance', description: 'Fees not exceeding cap set by State Fee Regulation Committee. Fee hike not more than 8-10% (state-wise). No capitation fee.', category: 'Financial', level: 'intermediate', boards: ['state', 'cbse'], mandatory: true },
  { id: 'f6',  title: '80G / 12A Certificate (if Charitable)', description: 'Schools registered as charitable institutions must hold valid 80G(5) and 12AB certificates under Income Tax Act. Renewed periodically.', category: 'Financial', level: 'intermediate', boards: ['all'], mandatory: false, reference: 'Income Tax Act §80G, §12AB' },
  { id: 'f7',  title: 'Annual Budget Prepared & Board-Approved', description: 'Annual income-expenditure budget prepared by management, reviewed by finance committee, approved by board of trustees.', category: 'Financial', level: 'intermediate', boards: ['all'], mandatory: false },
  { id: 'f8',  title: 'GST Registration & Returns (if applicable)', description: 'GST registration and timely returns for schools providing taxable services (coaching, transport, catering, etc.).', category: 'Financial', level: 'advanced', boards: ['all'], mandatory: false, reference: 'CGST Act 2017' },
  { id: 'f9',  title: 'Income Tax Return Filed (ITR-7 for Trust)', description: 'Annual income tax return filed by school trust/society. Tax exemption under §10(23C) or §12A claimed correctly.', category: 'Financial', level: 'advanced', boards: ['all'], mandatory: true, reference: 'Income Tax Act §10(23C)' },

  // ── Safety & Child Protection ─────────────────────────────────────────────
  { id: 'sp1', title: 'Anti-Bullying Policy Displayed & Implemented', description: 'Written anti-bullying policy displayed in classrooms and school website. Dedicated anti-bullying committee. Annual training for students.', category: 'Safety & Protection', level: 'basic', boards: ['all'], mandatory: true, reference: 'NCPCR Guidelines 2021' },
  { id: 'sp2', title: 'POCSO Internal Complaints Committee (ICC)', description: 'ICC constituted with external member, female majority. Displayed on notice board. Complaint register maintained. Annual report filed.', category: 'Safety & Protection', level: 'basic', boards: ['all'], mandatory: true, reference: 'POCSO Act 2012 §29' },
  { id: 'sp3', title: 'Emergency Evacuation Drills (Quarterly)', description: 'Fire, earthquake, and general emergency evacuation drills conducted quarterly. Drill records with time log maintained.', category: 'Safety & Protection', level: 'basic', boards: ['all'], mandatory: true },
  { id: 'sp4', title: 'Medical Emergency Protocol Displayed', description: 'Emergency response protocol (nearest hospital, ambulance, first responder) displayed on every floor. Staff aware of procedure.', category: 'Safety & Protection', level: 'basic', boards: ['all'], mandatory: true },
  { id: 'sp5', title: 'Visitor Register & ID Verification at Gate', description: 'Visitor register maintained at school gate. All visitors sign in, purpose noted, ID verified. Unauthorised entry prevented.', category: 'Safety & Protection', level: 'basic', boards: ['all'], mandatory: true },
  { id: 'sp6', title: 'School Bus Safety Compliance', description: 'School buses with valid permits, yellow colour, first aid kit, fire extinguisher, GPS, lady attendant. Drivers with valid licence & PV.', category: 'Safety & Protection', level: 'intermediate', boards: ['all'], mandatory: false, reference: 'SC Guidelines on School Bus Safety' },
  { id: 'sp7', title: 'Substance Abuse Prevention Programme', description: 'Annual awareness programme on drug/substance abuse for students Classes 6+. Guest sessions, counsellor involvement.', category: 'Safety & Protection', level: 'intermediate', boards: ['all'], mandatory: false, reference: 'NDPS Act; MoE Advisory' },
  { id: 'sp8', title: 'Anti-Ragging Committee & Policy', description: 'Anti-ragging committee constituted. Strict policy displayed. Online/offline complaint mechanism available. Zero-tolerance enforced.', category: 'Safety & Protection', level: 'intermediate', boards: ['cbse', 'icse'], mandatory: false },
  { id: 'sp9', title: 'Mental Health Support / Counsellor Available', description: 'Qualified counsellor (M.A. Psychology / MSW) on campus minimum 3 days/week. Confidential counselling sessions for students.', category: 'Safety & Protection', level: 'advanced', boards: ['all'], mandatory: false, reference: 'NEP 2020 §5.5' },

  // ── Digital & Data Compliance ─────────────────────────────────────────────
  { id: 'd1',  title: 'UDISE+ Data Submitted Annually', description: 'Complete UDISE+ data for the academic year submitted on the national portal by the deadline (typically Feb/Mar). Accurate and up-to-date.', category: 'Digital & Data', level: 'basic', boards: ['all'], mandatory: true, reference: 'MoE / NIEPA Annual Circular' },
  { id: 'd2',  title: 'School Website with Mandatory Disclosures', description: 'CBSE requires 22 mandatory disclosures on school website: affiliation no., fee structure, committee details, results, infrastructure, etc.', category: 'Digital & Data', level: 'basic', boards: ['cbse', 'icse'], mandatory: true, reference: 'CBSE Sahodaya; RTI Act 2005' },
  { id: 'd3',  title: 'Digital Attendance System Implemented', description: 'Biometric / app-based digital attendance for students and staff. CBSE mandates from 2025-26 session.', category: 'Digital & Data', level: 'intermediate', boards: ['cbse'], mandatory: false, reference: 'CBSE Circular ACAD-117/2024' },
  { id: 'd4',  title: 'Online Fee Payment Facility Available', description: 'UPI / netbanking / card payment option for school fees. Automated digital receipts. Reduces cash handling.', category: 'Digital & Data', level: 'intermediate', boards: ['all'], mandatory: false },
  { id: 'd5',  title: 'Student Data Privacy Policy Published', description: 'Clear data privacy/protection policy for student information. Parental consent obtained for data collection. Aligned with PDPB 2023.', category: 'Digital & Data', level: 'intermediate', boards: ['ib', 'icse'], mandatory: false, reference: 'Digital Personal Data Protection Act 2023' },
  { id: 'd6',  title: 'Parent Communication App / Portal', description: 'Digital platform (app/portal) for parent-teacher communication, fee payment, circulars, attendance notifications.', category: 'Digital & Data', level: 'intermediate', boards: ['all'], mandatory: false },
  { id: 'd7',  title: 'Cybersecurity Policy for School Network', description: 'Documented cybersecurity policy for school IT infrastructure. Content filtering, firewall, safe browsing for students. Staff training.', category: 'Digital & Data', level: 'advanced', boards: ['ib', 'cbse'], mandatory: false, reference: 'MeitY Cyber Hygiene Guidelines' },
  { id: 'd8',  title: 'School Management System (ERP) in Use', description: 'Integrated ERP/SMS for admissions, attendance, grades, fees, timetable, payroll. Data backed up regularly.', category: 'Digital & Data', level: 'advanced', boards: ['all'], mandatory: false },

  // ── Health & Hygiene ──────────────────────────────────────────────────────
  { id: 'h1',  title: 'Mid-Day Meal / PM POSHAN Compliance', description: 'Nutritious meals as per PM POSHAN scheme served to Classes 1-8 students. Calorie & protein norms met. Food testing records.', category: 'Health & Hygiene', level: 'basic', boards: ['state', 'cbse'], mandatory: false, reference: 'PM POSHAN Scheme Guidelines 2025' },
  { id: 'h2',  title: 'Clean Kitchen & Food Storage Standards', description: 'School kitchen meets FSSAI hygiene standards. Pest-free storage. No expired items. Cook with valid food handler certificate.', category: 'Health & Hygiene', level: 'basic', boards: ['all'], mandatory: false, reference: 'FSSAI Act 2006' },
  { id: 'h3',  title: 'Annual Pest Control Records Maintained', description: 'Professional pest control conducted twice a year. Certification from licensed pest control operator maintained.', category: 'Health & Hygiene', level: 'intermediate', boards: ['all'], mandatory: false },
  { id: 'h4',  title: 'Sanitation & Hygiene Programme for Students', description: 'Structured personal hygiene program: hand-washing stations, hygiene education in curriculum (Swachh Bharat alignment).', category: 'Health & Hygiene', level: 'intermediate', boards: ['all'], mandatory: false, reference: 'Swachh Bharat Mission (Schools)' },
  { id: 'h5',  title: 'Safe Waste Disposal (Bio & E-Waste)', description: 'Separate bins for biodegradable, non-biodegradable waste. E-waste (old computers, batteries) disposed through certified vendor.', category: 'Health & Hygiene', level: 'advanced', boards: ['all'], mandatory: false, reference: 'Solid Waste Mgmt Rules 2016; E-Waste Rules 2022' },

  // ── Accreditation & Quality ───────────────────────────────────────────────
  { id: 'q1',  title: 'NAAC / CBSE School Quality Assessment', description: 'Application submitted for NAAC school accreditation or CBSE\'s School Quality Assessment (SQAA). Self-evaluation report prepared.', category: 'Accreditation & Quality', level: 'advanced', boards: ['cbse', 'icse'], mandatory: false },
  { id: 'q2',  title: 'ISO 9001:2015 Quality Management System', description: 'ISO 9001:2015 certified for educational quality management. Covers curriculum delivery, admission processes, staff management, infrastructure.', category: 'Accreditation & Quality', level: 'advanced', boards: ['all'], mandatory: false },
  { id: 'q3',  title: 'Green School Certification', description: 'Application for MoEFCC Green School Programme or equivalent. Energy audit, water audit, biodiversity audit completed.', category: 'Accreditation & Quality', level: 'advanced', boards: ['all'], mandatory: false },
  { id: 'q4',  title: 'Annual School Development Plan (SDP)', description: 'Documented Annual School Development Plan with SMART goals, budget allocation, timelines, and review mechanism.', category: 'Accreditation & Quality', level: 'intermediate', boards: ['all'], mandatory: false },
  { id: 'q5',  title: 'School Management Committee (SMC) Active', description: 'SMC constituted with 75% parent/community representation as per RTE Act §21. Meets quarterly. Minutes recorded.', category: 'Accreditation & Quality', level: 'intermediate', boards: ['state', 'cbse'], mandatory: true, reference: 'RTE Act 2009 §21' },
  { id: 'q6',  title: 'Alumni Network & Industry Partnerships', description: 'Active alumni association. At least 3 formal industry/institution partnerships for internships, guest lectures, or skill development.', category: 'Accreditation & Quality', level: 'advanced', boards: ['ib', 'icse'], mandatory: false },
]

const CATEGORIES = [...new Set(CHECKLIST.map(i => i.category))]
const LEVEL_COLORS: Record<Level, string>      = { basic: 'bg-emerald-100 text-emerald-700', intermediate: 'bg-blue-100 text-blue-700', advanced: 'bg-purple-100 text-purple-700' }
const BOARD_LABELS: Record<Board, string>      = { all: 'All Boards', cbse: 'CBSE', icse: 'ICSE', ib: 'IB', state: 'State Board' }
const STATUS_STYLE: Record<ItemStatus, string> = { done: 'bg-emerald-500', pending: 'bg-gray-200', na: 'bg-gray-100' }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SCORE_COLOR = (s: number) => s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-amber-500' : 'text-red-500'
const SCORE_BG    = (s: number) => s >= 80 ? 'bg-emerald-50 border-emerald-200' : s >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
const GRADE_COLOR: Record<string, string> = {
  'A+': 'text-emerald-700 bg-emerald-100', 'A': 'text-emerald-600 bg-emerald-50',
  'B+': 'text-blue-700 bg-blue-100',       'B': 'text-blue-600 bg-blue-50',
  'C':  'text-amber-700 bg-amber-100',     'D': 'text-red-700 bg-red-100',
}
const PRIORITY_STYLE: Record<Priority, string> = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-gray-100 text-gray-600' }
const CERT_CFG: Record<CertStatus, { icon: React.ElementType; color: string; label: string }> = {
  compliant:       { icon: CheckCircle2, color: 'text-emerald-500', label: 'Compliant' },
  in_progress:     { icon: Clock,        color: 'text-amber-500',   label: 'In Progress' },
  action_required: { icon: XCircle,      color: 'text-red-500',     label: 'Action Required' },
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = 44; const circ = 2 * Math.PI * r; const dash = (score / 100) * circ
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  )
}

function ProgressBar({ value }: { value: number }) {
  const bg = value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500'
  return <div className="w-full bg-gray-100 rounded-full h-2"><div className={`h-2 rounded-full transition-all ${bg}`} style={{ width: `${Math.min(value, 100)}%` }} /></div>
}

// ─── Checklist Tab ────────────────────────────────────────────────────────────

function ChecklistTab() {
  const qc = useQueryClient()
  const [boardFilter, setBoardFilter] = useState<Board>('all')
  const [levelFilter, setLevelFilter] = useState<Level | 'all'>('all')
  const [catFilter, setCatFilter]     = useState<string>('all')
  const [search, setSearch]           = useState('')
  const [collapsed, setCollapsed]     = useState<Record<string, boolean>>({})

  const { data: settingsData } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => api.get('/api/v1/tenants/settings') as any,
  })
  const rawStatuses: Record<string, ItemStatus> = useMemo(() => {
    const raw = (settingsData as any)?.data?.compliance_checklist
    if (!raw) return {}
    try { return JSON.parse(raw) } catch { return {} }
  }, [settingsData])

  const saveMutation = useMutation({
    mutationFn: (statuses: Record<string, ItemStatus>) =>
      api.patch('/api/v1/tenants/settings', { settings: { compliance_checklist: JSON.stringify(statuses) } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-settings'] }),
  })

  const setStatus = (id: string, status: ItemStatus) => {
    const next = { ...rawStatuses, [id]: status }
    saveMutation.mutate(next)
  }

  const filtered = useMemo(() => CHECKLIST.filter(item => {
    if (boardFilter !== 'all' && !item.boards.includes('all') && !item.boards.includes(boardFilter)) return false
    if (levelFilter !== 'all' && item.level !== levelFilter) return false
    if (catFilter !== 'all' && item.category !== catFilter) return false
    if (search && !item.title.toLowerCase().includes(search.toLowerCase()) && !item.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [boardFilter, levelFilter, catFilter, search])

  const byCategory = useMemo(() => {
    const map: Record<string, CheckItem[]> = {}
    for (const item of filtered) {
      if (!map[item.category]) map[item.category] = []
      map[item.category].push(item)
    }
    return map
  }, [filtered])

  // Stats
  const total = filtered.length
  const done  = filtered.filter(i => rawStatuses[i.id] === 'done').length
  const na    = filtered.filter(i => rawStatuses[i.id] === 'na').length
  const applicable = total - na
  const doneRate   = applicable > 0 ? Math.round(done / applicable * 100) : 0

  const mandatory = filtered.filter(i => i.mandatory)
  const mandatoryDone = mandatory.filter(i => rawStatuses[i.id] === 'done').length

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Items', value: total, sub: `${filtered.filter(i => i.mandatory).length} mandatory` },
          { label: 'Completed', value: done, sub: `${doneRate}% of applicable` },
          { label: 'Mandatory Done', value: `${mandatoryDone}/${mandatory.length}`, sub: mandatory.length > 0 ? `${Math.round(mandatoryDone/mandatory.length*100)}% complete` : '—' },
          { label: 'Not Applicable', value: na, sub: 'marked N/A' },
        ].map(c => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs font-medium text-gray-700 mt-0.5">{c.label}</p>
            <p className="text-xs text-gray-400">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Overall progress */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Checklist Completion</span>
            <span className={`text-sm font-bold ${SCORE_COLOR(doneRate)}`}>{doneRate}%</span>
          </div>
          <ProgressBar value={doneRate} />
        </div>
        <div className={`text-lg font-bold px-3 py-1.5 rounded-xl ${GRADE_COLOR[doneRate >= 90 ? 'A+' : doneRate >= 80 ? 'A' : doneRate >= 70 ? 'B+' : doneRate >= 60 ? 'B' : doneRate >= 50 ? 'C' : 'D']}`}>
          {doneRate >= 90 ? 'A+' : doneRate >= 80 ? 'A' : doneRate >= 70 ? 'B+' : doneRate >= 60 ? 'B' : doneRate >= 50 ? 'C' : 'D'}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Filters</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Board */}
          <div className="flex gap-1 flex-wrap">
            {(['all', 'cbse', 'icse', 'ib', 'state'] as Board[]).map(b => (
              <button key={b} onClick={() => setBoardFilter(b)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${boardFilter === b ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {BOARD_LABELS[b]}
              </button>
            ))}
          </div>
          <div className="w-px bg-gray-200" />
          {/* Level */}
          <div className="flex gap-1">
            {(['all', 'basic', 'intermediate', 'advanced'] as const).map(l => (
              <button key={l} onClick={() => setLevelFilter(l)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition capitalize ${levelFilter === l ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {/* Category */}
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
            <Search size={13} className="text-gray-400 flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search checklist…"
              className="text-xs flex-1 outline-none text-gray-700 placeholder-gray-400" />
          </div>
        </div>
      </div>

      {/* Checklist groups */}
      <div className="space-y-4">
        {Object.entries(byCategory).map(([cat, items]) => {
          const catDone = items.filter(i => rawStatuses[i.id] === 'done').length
          const catNa   = items.filter(i => rawStatuses[i.id] === 'na').length
          const catApp  = items.length - catNa
          const catPct  = catApp > 0 ? Math.round(catDone / catApp * 100) : 0
          const isCollapsed = collapsed[cat]

          return (
            <div key={cat} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => setCollapsed(p => ({ ...p, [cat]: !p[cat] }))}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900 text-sm">{cat}</span>
                  <span className="text-xs text-gray-400">{items.length} items</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${catPct >= 80 ? 'bg-emerald-100 text-emerald-700' : catPct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {catPct}% done
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24">
                    <ProgressBar value={catPct} />
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
                </div>
              </button>

              {!isCollapsed && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {items.map(item => {
                    const status: ItemStatus = rawStatuses[item.id] || 'pending'
                    return (
                      <div key={item.id} className={`px-5 py-4 flex items-start gap-4 transition-colors ${status === 'done' ? 'bg-emerald-50/30' : status === 'na' ? 'bg-gray-50/60' : 'bg-white'}`}>
                        {/* Status toggle */}
                        <button
                          onClick={() => setStatus(item.id, status === 'done' ? 'pending' : 'done')}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition ${status === 'done' ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 hover:border-indigo-400'}`}
                        >
                          {status === 'done' && <CheckCircle2 size={12} className="text-white" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`font-medium text-sm ${status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{item.title}</span>
                            {item.mandatory && <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">Mandatory</span>}
                          </div>
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${LEVEL_COLORS[item.level]}`}>{item.level}</span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {item.boards.includes('all') ? 'All Boards' : item.boards.map(b => BOARD_LABELS[b]).join(', ')}
                            </span>
                            {item.reference && <span className="text-xs text-gray-400 italic">{item.reference}</span>}
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
                        </div>

                        {/* NA toggle */}
                        <button
                          onClick={() => setStatus(item.id, status === 'na' ? 'pending' : 'na')}
                          className={`text-xs px-2 py-1 rounded-lg border transition flex-shrink-0 ${status === 'na' ? 'border-gray-400 bg-gray-100 text-gray-600 font-medium' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                        >N/A</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        {Object.keys(byCategory).length === 0 && (
          <div className="text-center text-gray-400 py-12 text-sm">No checklist items match your filters.</div>
        )}
      </div>
    </div>
  )
}

// ─── Other tab components ─────────────────────────────────────────────────────

function CertCard({ cert }: { cert: any }) {
  const cfg = CERT_CFG[cert.status as CertStatus]
  const Icon = cfg.icon
  return (
    <div className={`border rounded-xl p-4 ${cert.status === 'compliant' ? 'border-emerald-200 bg-emerald-50/40' : cert.status === 'in_progress' ? 'border-amber-200 bg-amber-50/40' : 'border-red-200 bg-red-50/40'}`}>
      <div className="flex items-start justify-between mb-2">
        <Icon size={18} className={cfg.color} />
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cert.status === 'compliant' ? 'bg-emerald-100 text-emerald-700' : cert.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{cfg.label}</span>
      </div>
      <h4 className="font-semibold text-gray-900 text-sm">{cert.name}</h4>
      <p className="text-xs text-gray-500 mt-0.5">{cert.issuer}</p>
      <p className="text-xs text-gray-400 mt-2 leading-relaxed">{cert.description}</p>
    </div>
  )
}

function BoardTab({ board, metrics }: { board: any; metrics: Record<string, number> }) {
  return (
    <div className="space-y-3">
      {board.requirements.map((req: any) => (
        <div key={req.id} className={`border rounded-xl p-4 ${SCORE_BG(req.score)}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {req.passed ? <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" /> : <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />}
              <span className="font-medium text-gray-900 text-sm">{req.area}</span>
            </div>
            <span className={`text-sm font-bold ${SCORE_COLOR(req.score)}`}>{Math.round(req.score)}%</span>
          </div>
          <p className="text-xs text-gray-600 mb-2">{req.requirement}</p>
          <ProgressBar value={req.score} />
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>Actual: <span className={`font-medium ${req.passed ? 'text-emerald-600' : 'text-amber-600'}`}>{req.actual}{req.unit}</span></span>
            <span>Required: <span className="font-medium">{req.threshold}{req.unit}</span></span>
          </div>
        </div>
      ))}
    </div>
  )
}

function NewsCard({ item }: { item: NewsItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
      <button onClick={() => setOpen(!open)} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLE[item.priority]}`}>{item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}</span>
              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{item.category}</span>
              <span className="text-xs text-gray-400 ml-auto">{new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <h4 className="font-medium text-gray-900 text-sm leading-snug">{item.title}</h4>
          </div>
          <ChevronRight size={16} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
        {open && <p className="text-sm text-gray-600 mt-3 leading-relaxed border-t border-gray-100 pt-3">{item.summary}</p>}
      </button>
    </div>
  )
}

function NotifCard({ item }: { item: GovtNotif }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`border rounded-xl overflow-hidden ${item.priority === 'high' ? 'border-red-200' : item.priority === 'medium' ? 'border-amber-200' : 'border-gray-200'}`}>
      <button onClick={() => setOpen(!open)} className="w-full text-left p-4">
        <div className="flex items-start gap-3">
          <Bell size={16} className={`${item.priority === 'high' ? 'text-red-500' : item.priority === 'medium' ? 'text-amber-500' : 'text-gray-400'} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLE[item.priority]}`}>{item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}</span>
              <span className="text-xs text-gray-500">{item.issuer}</span>
              <span className="text-xs text-gray-400 ml-auto">{new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <h4 className="font-medium text-gray-900 text-sm leading-snug">{item.title}</h4>
            {open && <div className="mt-3 border-t border-gray-100 pt-3 space-y-2"><p className="text-sm text-gray-600 leading-relaxed">{item.body}</p><p className="text-xs text-gray-400 font-mono">Ref: {item.ref}</p></div>}
          </div>
          <ChevronRight size={16} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const BOARD_TABS_LIST = [
  { key: 'cbse',  label: 'CBSE',       icon: Building2 },
  { key: 'icse',  label: 'ICSE',       icon: Award },
  { key: 'ib',    label: 'IB',         icon: BookOpen },
  { key: 'state', label: 'State Board', icon: FileText },
] as const

type PageTab = 'overview' | 'boards' | 'checklist' | 'news'

export default function CompliancePage() {
  const [pageTab,   setPageTab]   = useState<PageTab>('overview')
  const [boardTab,  setBoardTab]  = useState<'cbse' | 'icse' | 'ib' | 'state'>('cbse')
  const [newsFilter, setNewsFilter] = useState<'all' | Priority>('all')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['compliance-dashboard'],
    queryFn: () => api.get('/api/v1/analytics/compliance/dashboard') as any,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  })

  const d             = (data as any)?.data || {}
  const breakdown     = (d.breakdown || []) as BreakdownItem[]
  const certifications = (d.certifications || []) as any[]
  const boards        = (d.boards || {}) as Record<string, any>
  const news          = (d.recent_news || []) as NewsItem[]
  const notifs        = (d.govt_notifications || []) as GovtNotif[]
  const overall       = d.overall_score || 0
  const grade         = d.grade || '-'
  const metrics       = d.metrics || {}

  const filteredNews = newsFilter === 'all' ? news : news.filter(n => n.priority === newsFilter)
  const certCounts   = { compliant: certifications.filter(c => c.status === 'compliant').length, in_progress: certifications.filter(c => c.status === 'in_progress').length, action_required: certifications.filter(c => c.status === 'action_required').length }
  const activeBoard  = boards[boardTab]

  const PAGE_TABS: { id: PageTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview',  label: 'Overview',    icon: ShieldCheck },
    { id: 'boards',    label: 'Board Compliance', icon: Award },
    { id: 'checklist', label: 'Compliance Checklist', icon: ClipboardList },
    { id: 'news',      label: 'News & Notifications', icon: Newspaper },
  ]

  if (isLoading) return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
      <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}</div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Real-time compliance scores, checklists & regulatory updates
            {d.last_updated && <span className="text-gray-400"> · Last updated {d.last_updated}</span>}
          </p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Score summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 md:col-span-1">
          <div className="relative w-16 h-16 flex-shrink-0">
            <ScoreRing score={overall} size={64} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-sm font-bold ${SCORE_COLOR(overall)}`}>{overall}</span>
            </div>
          </div>
          <div>
            <span className={`text-xl font-bold px-2 py-1 rounded-lg ${GRADE_COLOR[grade] || 'text-gray-700 bg-gray-100'}`}>{grade}</span>
            <p className="text-xs text-gray-500 mt-1">Overall Score</p>
          </div>
        </div>
        {[
          { label: 'Compliant Certs', value: certCounts.compliant,       color: 'text-emerald-600', sub: `of ${certifications.length}` },
          { label: 'Action Required', value: certCounts.action_required,  color: 'text-red-600',     sub: 'certifications' },
          { label: 'Gov\'t Notifications', value: notifs.filter(n => n.priority === 'high').length, color: 'text-amber-600', sub: 'urgent' },
        ].map(c => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs font-medium text-gray-700 mt-0.5">{c.label}</p>
            <p className="text-xs text-gray-400">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Page tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {PAGE_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setPageTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${pageTab === id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {pageTab === 'overview' && (
        <div className="space-y-6">
          {/* Breakdown */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {breakdown.map(item => (
              <div key={item.key} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600 truncate pr-1">{item.label}</span>
                  <span className={`text-sm font-bold ${SCORE_COLOR(item.score)}`}>{item.score}%</span>
                </div>
                <ProgressBar value={item.score} />
                <p className="text-xs text-gray-400 mt-1.5 leading-snug">{item.description}</p>
                <span className="text-xs text-gray-300 mt-1 block">Weight: {item.weight}%</span>
              </div>
            ))}
          </div>

          {/* Certifications */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2"><ShieldCheck size={16} className="text-indigo-500" /> Certifications</h2>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={12} /> {certCounts.compliant}</span>
                <span className="flex items-center gap-1 text-amber-600"><Clock size={12} /> {certCounts.in_progress}</span>
                <span className="flex items-center gap-1 text-red-600"><XCircle size={12} /> {certCounts.action_required}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {certifications.map((cert: any) => <CertCard key={cert.id} cert={cert} />)}
            </div>
          </div>
        </div>
      )}

      {/* ── Board Compliance Tab ── */}
      {pageTab === 'boards' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {BOARD_TABS_LIST.map(({ key, label, icon: Icon }) => {
              const b = boards[key]
              return (
                <button key={key} onClick={() => setBoardTab(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition border ${boardTab === key ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200'}`}>
                  <Icon size={14} /> {label}
                  {b && <span className={`ml-1 text-xs px-1.5 py-0.5 rounded font-bold ${boardTab === key ? 'bg-white/20 text-white' : GRADE_COLOR[b.grade] || 'bg-gray-100'}`}>{b.grade}</span>}
                </button>
              )
            })}
          </div>
          {activeBoard && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-semibold text-gray-900">{activeBoard.full_name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{activeBoard.requirements.length} requirements tracked</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16">
                    <ScoreRing score={activeBoard.score} size={64} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-sm font-bold ${SCORE_COLOR(activeBoard.score)}`}>{Math.round(activeBoard.score)}</span>
                    </div>
                  </div>
                  <span className={`text-xl font-bold px-3 py-1.5 rounded-xl ${GRADE_COLOR[activeBoard.grade] || 'text-gray-700 bg-gray-100'}`}>{activeBoard.grade}</span>
                </div>
              </div>
              <BoardTab board={activeBoard} metrics={metrics} />
            </div>
          )}
        </div>
      )}

      {/* ── Checklist Tab ── */}
      {pageTab === 'checklist' && <ChecklistTab />}

      {/* ── News & Notifications Tab ── */}
      {pageTab === 'news' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2"><Newspaper size={16} className="text-indigo-500" /> Recent Compliance News</h2>
              <div className="flex gap-1">
                {(['all', 'high', 'medium', 'low'] as const).map(f => (
                  <button key={f} onClick={() => setNewsFilter(f)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition capitalize ${newsFilter === f ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{f}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredNews.map(item => <NewsCard key={item.id} item={item} />)}
            </div>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Bell size={16} className="text-indigo-500" /> Government Notifications
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{notifs.filter(n => n.priority === 'high').length} urgent</span>
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {notifs.map(item => <NotifCard key={item.id} item={item} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
