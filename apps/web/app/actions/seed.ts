"use server";

import { createRecord, getRecords } from "./records";

/**
 * Seed the database with sample B2B data.
 * Idempotent: if any opportunity already exists, seeding is skipped.
 */
export async function seedDatabase() {
  // Idempotency check
  const existing = await getRecords("opportunity");
  if (existing.length > 0) {
    return {
      skipped: true,
      accounts: 0,
      opportunities: 0,
      contacts: 0,
    };
  }

  // -------------------------------------------------------------------------
  // 1. Accounts
  // -------------------------------------------------------------------------
  const accountsData = [
    {
      name: "Acme Cloud Technologies",
      industry: "Cloud Infrastructure",
      website: "https://acmecloud.io",
      employeeCount: 450,
      annualRevenue: 85_000_000,
      billingCity: "San Francisco",
      billingState: "CA",
      owner: "Sarah Chen",
      description: "Enterprise cloud infrastructure provider specializing in Kubernetes orchestration and edge computing.",
    },
    {
      name: "Meridian Analytics",
      industry: "Data Analytics",
      website: "https://meridiananalytics.com",
      employeeCount: 220,
      annualRevenue: 42_000_000,
      billingCity: "Austin",
      billingState: "TX",
      owner: "Sarah Chen",
      description: "Real-time analytics platform for e-commerce and SaaS companies.",
    },
    {
      name: "Quantum Logic Systems",
      industry: "Enterprise Software",
      website: "https://quantumlogic.dev",
      employeeCount: 1200,
      annualRevenue: 310_000_000,
      billingCity: "Seattle",
      billingState: "WA",
      owner: "James Park",
      description: "Developer platform for building and deploying AI-powered enterprise applications.",
    },
    {
      name: "NovaPay Financial",
      industry: "Fintech",
      website: "https://novapay.com",
      employeeCount: 680,
      annualRevenue: 125_000_000,
      billingCity: "New York",
      billingState: "NY",
      owner: "James Park",
      description: "Next-generation payment processing and financial infrastructure for B2B transactions.",
    },
    {
      name: "GreenScale Energy",
      industry: "Clean Technology",
      website: "https://greenscale.energy",
      employeeCount: 350,
      annualRevenue: 58_000_000,
      billingCity: "Denver",
      billingState: "CO",
      owner: "Sarah Chen",
      description: "IoT-powered energy management platform for commercial buildings and data centers.",
    },
  ];

  const accountIds: string[] = [];
  for (const acct of accountsData) {
    const { id } = await createRecord("account", acct);
    accountIds.push(id);
  }

  // -------------------------------------------------------------------------
  // 2. Opportunities
  // -------------------------------------------------------------------------
  const opportunitiesData = [
    {
      accountId: accountIds[0],
      name: "Acme Cloud - Platform Migration",
      stage: "Technical Win",
      stageNumber: 3,
      amount: 280_000,
      closeDate: "2026-04-15",
      probability: 60,
      type: "New Business",
      owner: "Sarah Chen",
      nextStep: "Schedule technical deep-dive with CTO",
    },
    {
      accountId: accountIds[0],
      name: "Acme Cloud - Edge Deployment Add-on",
      stage: "Discovery",
      stageNumber: 1,
      amount: 75_000,
      closeDate: "2026-06-30",
      probability: 20,
      type: "Expansion",
      owner: "Sarah Chen",
      nextStep: "Initial discovery call scheduled for next week",
    },
    {
      accountId: accountIds[1],
      name: "Meridian Analytics - Dashboard Rebuild",
      stage: "Qualification",
      stageNumber: 2,
      amount: 150_000,
      closeDate: "2026-05-20",
      probability: 40,
      type: "New Business",
      owner: "Sarah Chen",
      nextStep: "Send ROI analysis and customer references",
    },
    {
      accountId: accountIds[2],
      name: "Quantum Logic - Enterprise License",
      stage: "Business Case",
      stageNumber: 4,
      amount: 520_000,
      closeDate: "2026-03-31",
      probability: 75,
      type: "New Business",
      owner: "James Park",
      nextStep: "Final pricing review with procurement",
    },
    {
      accountId: accountIds[2],
      name: "Quantum Logic - Dev Portal Redesign",
      stage: "Negotiation",
      stageNumber: 5,
      amount: 340_000,
      closeDate: "2026-03-15",
      probability: 85,
      type: "New Business",
      owner: "James Park",
      nextStep: "Legal review of MSA in progress",
    },
    {
      accountId: accountIds[3],
      name: "NovaPay - Checkout SDK Integration",
      stage: "Technical Win",
      stageNumber: 3,
      amount: 195_000,
      closeDate: "2026-05-01",
      probability: 55,
      type: "New Business",
      owner: "James Park",
      nextStep: "POC environment handoff to engineering team",
    },
    {
      accountId: accountIds[3],
      name: "NovaPay - Compliance Dashboard",
      stage: "Closed Won",
      stageNumber: 7,
      amount: 88_000,
      closeDate: "2026-01-20",
      probability: 100,
      type: "Expansion",
      owner: "James Park",
      nextStep: "Onboarding kickoff completed",
    },
    {
      accountId: accountIds[4],
      name: "GreenScale - IoT Portal",
      stage: "Discovery",
      stageNumber: 1,
      amount: 120_000,
      closeDate: "2026-07-15",
      probability: 15,
      type: "New Business",
      owner: "Sarah Chen",
      nextStep: "Map out current tech stack and integration points",
    },
    {
      accountId: accountIds[4],
      name: "GreenScale - Monitoring App Refresh",
      stage: "Closed Lost",
      stageNumber: 8,
      amount: 65_000,
      closeDate: "2026-01-10",
      probability: 0,
      type: "New Business",
      owner: "Sarah Chen",
      nextStep: "Lost to competitor; revisit in Q3",
    },
    {
      accountId: accountIds[1],
      name: "Meridian Analytics - Self-Serve Expansion",
      stage: "Business Case",
      stageNumber: 4,
      amount: 210_000,
      closeDate: "2026-04-30",
      probability: 70,
      type: "Expansion",
      owner: "Sarah Chen",
      nextStep: "VP of Product reviewing business case deck",
    },
  ];

  for (const opp of opportunitiesData) {
    await createRecord("opportunity", opp);
  }

  // -------------------------------------------------------------------------
  // 3. Contacts
  // -------------------------------------------------------------------------
  const contactsData = [
    // Acme Cloud (accountIds[0])
    {
      accountId: accountIds[0],
      firstName: "David",
      lastName: "Martinez",
      email: "d.martinez@acmecloud.io",
      phone: "+1-415-555-0101",
      title: "Chief Technology Officer",
      department: "Engineering",
      role: "Decision Maker",
    },
    {
      accountId: accountIds[0],
      firstName: "Emily",
      lastName: "Nakamura",
      email: "e.nakamura@acmecloud.io",
      phone: "+1-415-555-0102",
      title: "VP of Engineering",
      department: "Engineering",
      role: "Champion",
    },
    {
      accountId: accountIds[0],
      firstName: "Ryan",
      lastName: "O'Brien",
      email: "r.obrien@acmecloud.io",
      phone: "+1-415-555-0103",
      title: "Solutions Architect",
      department: "Engineering",
      role: "Evaluator",
    },
    // Meridian Analytics (accountIds[1])
    {
      accountId: accountIds[1],
      firstName: "Jessica",
      lastName: "Thompson",
      email: "j.thompson@meridiananalytics.com",
      phone: "+1-512-555-0201",
      title: "VP of Product",
      department: "Product",
      role: "Economic Buyer",
    },
    {
      accountId: accountIds[1],
      firstName: "Alex",
      lastName: "Kumar",
      email: "a.kumar@meridiananalytics.com",
      phone: "+1-512-555-0202",
      title: "Head of Frontend",
      department: "Engineering",
      role: "Champion",
    },
    {
      accountId: accountIds[1],
      firstName: "Maria",
      lastName: "Santos",
      email: "m.santos@meridiananalytics.com",
      phone: "+1-512-555-0203",
      title: "Product Manager",
      department: "Product",
      role: "Influencer",
    },
    // Quantum Logic (accountIds[2])
    {
      accountId: accountIds[2],
      firstName: "Michael",
      lastName: "Chang",
      email: "m.chang@quantumlogic.dev",
      phone: "+1-206-555-0301",
      title: "CTO",
      department: "Engineering",
      role: "Decision Maker",
    },
    {
      accountId: accountIds[2],
      firstName: "Laura",
      lastName: "Petersen",
      email: "l.petersen@quantumlogic.dev",
      phone: "+1-206-555-0302",
      title: "Director of Platform Engineering",
      department: "Engineering",
      role: "Champion",
    },
    {
      accountId: accountIds[2],
      firstName: "Amir",
      lastName: "Hussain",
      email: "a.hussain@quantumlogic.dev",
      phone: "+1-206-555-0303",
      title: "Procurement Manager",
      department: "Finance",
      role: "Gatekeeper",
    },
    // NovaPay (accountIds[3])
    {
      accountId: accountIds[3],
      firstName: "Sophia",
      lastName: "Williams",
      email: "s.williams@novapay.com",
      phone: "+1-212-555-0401",
      title: "Head of Engineering",
      department: "Engineering",
      role: "Champion",
    },
    {
      accountId: accountIds[3],
      firstName: "Daniel",
      lastName: "Lee",
      email: "d.lee@novapay.com",
      phone: "+1-212-555-0402",
      title: "VP of Compliance",
      department: "Legal",
      role: "Influencer",
    },
    {
      accountId: accountIds[3],
      firstName: "Priya",
      lastName: "Sharma",
      email: "p.sharma@novapay.com",
      phone: "+1-212-555-0403",
      title: "Senior Frontend Developer",
      department: "Engineering",
      role: "Evaluator",
    },
    // GreenScale (accountIds[4])
    {
      accountId: accountIds[4],
      firstName: "Thomas",
      lastName: "Anderson",
      email: "t.anderson@greenscale.energy",
      phone: "+1-303-555-0501",
      title: "CEO",
      department: "Executive",
      role: "Economic Buyer",
    },
    {
      accountId: accountIds[4],
      firstName: "Rachel",
      lastName: "Kim",
      email: "r.kim@greenscale.energy",
      phone: "+1-303-555-0502",
      title: "Director of Technology",
      department: "Engineering",
      role: "Decision Maker",
    },
    {
      accountId: accountIds[4],
      firstName: "Kevin",
      lastName: "Brooks",
      email: "k.brooks@greenscale.energy",
      phone: "+1-303-555-0503",
      title: "IoT Platform Lead",
      department: "Engineering",
      role: "Evaluator",
    },
  ];

  for (const contact of contactsData) {
    await createRecord("contact", contact);
  }

  return {
    skipped: false,
    accounts: accountsData.length,
    opportunities: opportunitiesData.length,
    contacts: contactsData.length,
  };
}
