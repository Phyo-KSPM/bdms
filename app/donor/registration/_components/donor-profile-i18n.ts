import type { Locale } from "@/components/i18n/locale-provider"
import type {
  DonationRecord,
  Donor,
  ScreeningVisit,
} from "@/lib/donor-store"

export function getMedicalConditionOptions(locale: Locale) {
  return locale === "en"
    ? [
        { key: "diabetes", label: "Diabetes" },
        { key: "hypertension", label: "Hypertension" },
        { key: "heart_disease", label: "Heart disease" },
      ]
    : [
        { key: "diabetes", label: "ဆီးချို" },
        { key: "hypertension", label: "သွေးတိုး" },
        { key: "heart_disease", label: "နှလုံးရောဂါ" },
      ]
}

export function getInfectiousOptions(locale: Locale) {
  return locale === "en"
    ? [
        { key: "hepatitis", label: "Hepatitis" },
        { key: "malaria", label: "Malaria" },
        { key: "hiv", label: "HIV" },
      ]
    : [
        { key: "hepatitis", label: "အသည်းရောင်" },
        { key: "malaria", label: "ငှက်ဖျား" },
        { key: "hiv", label: "HIV" },
      ]
}

export function getDonationTypeOptions(locale: Locale) {
  return locale === "en"
    ? [
        { key: "whole_blood", label: "Whole blood" },
        { key: "platelets", label: "Platelets" },
        { key: "plasma", label: "Plasma" },
        { key: "double_red_cells", label: "Double red cells" },
      ]
    : [
        { key: "whole_blood", label: "သွေးရိုးရိုး" },
        { key: "platelets", label: "သွေးဥ" },
        { key: "plasma", label: "ပလားစမာ" },
        { key: "double_red_cells", label: "RBC နှစ်ဆ" },
      ]
}

export function formatDonorDateTime(value: string, locale: Locale) {
  return new Date(value).toLocaleString(locale === "mm" ? "my-MM" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatMedicalKeyList(
  keys: string[],
  options: readonly { key: string; label: string }[]
) {
  if (keys.length === 0) return ""
  const labelByKey = new Map(options.map((option) => [option.key, option.label]))
  return keys.map((key) => labelByKey.get(key) ?? key).join(", ")
}

export function getDonorNotebookLabels(locale: Locale) {
  if (locale === "en") {
    return {
      notebookTitle: "Related records",
      donations: "Donations",
      screening: "Screening",
      medical: "Medical history",
      donationInfo: "Donation info",
      noDonations: "No donations recorded for this donor.",
      noVisits: "No screening visits recorded.",
      donationId: "Bag / Donation ID",
      donatedAt: "Donated at",
      donationType: "Type",
      volume: "Volume",
      bagStatus: "Bag status",
      visitDate: "Visit date",
      visitStatus: "Status",
      screenedBy: "Screened by",
      weight: "Weight",
      bp: "Blood pressure",
      pulse: "Pulse",
      hb: "Hb",
      conditions: "Conditions",
      infectiousFlags: "Infectious flags",
      medications: "Medications",
      medicalNotes: "Medical notes",
      preferredType: "Preferred donation type",
      donationNotes: "Donation notes",
      none: "—",
      ml: "ml",
    } as const
  }

  return {
    notebookTitle: "ဆက်စပ်မှတ်တမ်းများ",
    donations: "လှူဒါန်းမှုများ",
    screening: "စစ်ဆေးမှု",
    medical: "ဆေးဘက်ဆိုင်ရာ မှတ်တမ်း",
    donationInfo: "လှူဒါန်းမှု အချက်အလက်",
    noDonations: "လှူဒါန်းမှု မှတ်တမ်း မရှိသေးပါ။",
    noVisits: "စစ်ဆေးမှတ်တမ်း မရှိသေးပါ။",
    donationId: "Bag / Donation ID",
    donatedAt: "လှူဒါန်းမှု သည့်အချိန်",
    donationType: "အမျိုးအစား",
    volume: "ပမာဏ",
    bagStatus: "Bag အခြေအနေ",
    visitDate: "စစ်ဆေးရက်စွဲ",
    visitStatus: "အခြေအနေ",
    screenedBy: "စစ်ဆေးသူ",
    weight: "ကိုယ်အလေးချိန်",
    bp: "သွေးပေါင်ချိန်",
    pulse: "သွေးခုန်နှုန်း",
    hb: "သွေးအား (Hb)",
    conditions: "ရောဂါအခံ",
    infectiousFlags: "ကူးစက်ရောဂါများ",
    medications: "သောက်နေသော ဆ약",
    medicalNotes: "ဆေးဘက်ဆိုင်ရာ မှတ်ချက်",
    preferredType: "လိုလားသော လှူဒါန်းမှု အမျိုးအစား",
    donationNotes: "လှူဒါန်းမှု မှတ်ချက်",
    none: "—",
    ml: "ml",
  } as const
}

export function getDonorStatusLabels(locale: Locale) {
  if (locale === "en") {
    return {
      bagPending: "Pending testing",
      bagReady: "Ready to use",
      bagDiscarded: "Discarded",
      visitPending: "Pending",
      visitPassed: "Passed",
      visitDeferred: "Deferred",
      typeWholeBlood: "Whole blood",
      typePlatelets: "Platelets",
      typePlasma: "Plasma",
      typeDoubleRed: "Double red cells",
    } as const
  }

  return {
    bagPending: "စစ်ဆေးဆဲ",
    bagReady: "အသုံးပြုနိုင်",
    bagDiscarded: "စွန့်ပစ်",
    visitPending: "ဆိုင်းငံ့",
    visitPassed: "ဖြတ်သန်း",
    visitDeferred: "ရွှေ့ဆိုင်း",
    typeWholeBlood: "သွေးရိုးရိုး",
    typePlatelets: "သွေးဥ",
    typePlasma: "ပလားစမာ",
    typeDoubleRed: "RBC နှစ်ဆ",
  } as const
}

export function formatBagStatusLabel(
  status: DonationRecord["bloodBagStatus"],
  labels: ReturnType<typeof getDonorStatusLabels>
) {
  switch (status) {
    case "ready_to_use":
      return labels.bagReady
    case "discarded":
      return labels.bagDiscarded
    default:
      return labels.bagPending
  }
}

export function formatVisitStatusLabel(
  status: ScreeningVisit["status"],
  labels: ReturnType<typeof getDonorStatusLabels>
) {
  switch (status) {
    case "passed":
      return labels.visitPassed
    case "deferred":
      return labels.visitDeferred
    default:
      return labels.visitPending
  }
}

export function formatDonationTypeLabel(
  type: Donor["donationDetails"]["donationType"],
  labels: ReturnType<typeof getDonorStatusLabels>
) {
  switch (type) {
    case "whole_blood":
      return labels.typeWholeBlood
    case "platelets":
      return labels.typePlatelets
    case "plasma":
      return labels.typePlasma
    case "double_red_cells":
      return labels.typeDoubleRed
    default:
      return ""
  }
}

export function getDonorActionLogLabels(locale: Locale) {
  if (locale === "en") {
    return {
      title: "Action log",
      empty: "No activity recorded yet.",
      activitySingular: "activity",
      activityPlural: "activities",
      created: "Created",
      updated: "Updated",
      deleted: "Deleted",
      registered: "Registered donor {id}",
      system: "System",
      changed: "Changes",
      from: "from",
      to: "to",
    } as const
  }

  return {
    title: "လုပ်ဆောင်မှု မှတ်တမ်း",
    empty: "Activity မရှိသေးပါ။",
    activitySingular: "ခု",
    activityPlural: "ခု",
    created: "ဖန်တီးထားသည်",
    updated: "ပြင်ဆင်ထားသည်",
    deleted: "ဖျက်ထားသည်",
    registered: "Donor {id} မှတ်ပုံတင်ထားသည်",
    system: "စနစ်",
    changed: "ပြောင်းလဲမှုများ",
    from: "မှ",
    to: "သို့",
  } as const
}

export function getDonorFieldLabels(locale: Locale) {
  if (locale === "en") {
    return {
      name: "Name",
      age: "Age",
      bloodType: "Blood type",
      gender: "Gender",
      nrc: "NRC",
      eid: "EID",
      contactPhone: "Phone",
      contactEmail: "Email",
      contactAddress: "Address",
      township: "Township",
      city: "City",
      address: "Full address",
      "screening.weightKg": "Weight (kg)",
      "screening.bpSystolic": "BP systolic",
      "screening.bpDiastolic": "BP diastolic",
      "screening.pulse": "Pulse",
      "screening.hb": "Hb",
      "medical.conditions": "Conditions",
      "medical.medications": "Medications",
      "medical.notes": "Medical notes",
      "donationDetails.donationType": "Donation type",
      "donationDetails.notes": "Donation notes",
    } as const
  }

  return {
    name: "အမည်",
    age: "အသက်",
    bloodType: "သွေးအမျိုးအစား",
    gender: "ကျား/မ",
    nrc: "NRC",
    eid: "EID",
    contactPhone: "ဖုန်း",
    contactEmail: "အီးမေးလ်",
    contactAddress: "လိပ်စာ",
    township: "မြို့နယ်",
    city: "မြို့",
    address: "အသေးစိတ်လိပ်စာ",
    "screening.weightKg": "ကိုယ်အလေးချိန် (kg)",
    "screening.bpSystolic": "သွေးပေါင် (အပေါ်)",
    "screening.bpDiastolic": "သွေးပေါင် (အောက်)",
    "screening.pulse": "သွေးခုန်နှုန်း",
    "screening.hb": "သွေးအား (Hb)",
    "medical.conditions": "ရောဂါအခံ",
    "medical.medications": "သောက်နေသော ဆ약",
    "medical.notes": "ဆေးဘက်ဆိုင်ရာ မှတ်ချက်",
    "donationDetails.donationType": "လှူဒါန်းမှု အမျိုးအစား",
    "donationDetails.notes": "လှူဒါန်းမှု မှတ်ချက်",
  } as const
}
