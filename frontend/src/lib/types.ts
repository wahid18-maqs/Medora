export interface User {
  name: string;
  email: string;
}

export type SourceType = "PDF" | "Image";

export type UploadStatus =
  | "empty"
  | "extracting"
  | "reviewing"
  | "analyzing"
  | "ready"
  | "error";

export interface ExtractedMarker {
  marker: string;
  value: string;
  unit: string;
  reference_range: string;
  confidence: number;
  plausibility_warning?: string | null;
}

export interface ImageExtractionResponse {
  status: string;
  lab_name?: string | null;
  report_date?: string | null;
  markers: ExtractedMarker[];
  marker_warning?: string | null;
  file_names: string[];
  query?: string;
}

export interface ConfirmImagePayload {
  markers: ExtractedMarker[];
  lab_name?: string | null;
  report_date?: string | null;
  file_names: string[];
  query: string;
}

export interface HistoryItem {
  analysis_id?: string;
  report_type?: string;
  diagnostic_center?: string;
  marker_warning?: string | null;
  status?: string;
  file: string;
  query: string;
  analysis: string;
  agents?: {
    medical: string;
    verification: string;
    nutrition: string;
    exercise: string;
  };
  markers?: Marker[];
  source_type?: SourceType;
  report_date?: string | null;
  timestamp: string;
}

export interface PaginatedHistory {
  items: HistoryItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface Marker {
  name: string;
  value: number;
  unit: string;
  range: [number, number];
  status: "Low" | "High" | "Normal";
}

export interface AnalysisResult {
  id: string;
  date: string;
  title: string;
  source: string;
  reportType?: string;
  diagnosticCenter?: string;
  markerWarning?: string | null;
  sourceType?: SourceType;
  reportDate?: string | null;
  timestamp?: string;
  agents: {
    medical: string;
    verification: string;
    nutrition: string;
    exercise: string;
  };
  markers: Marker[];
}

export interface ChatMessage {
  id?: string;
  report_id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}


export interface MedicalCondition {
  id?: string;
  name: string;
  notes: string;
}

export interface SurgicalHistory {
  id?: string;
  procedure: string;
  date: string;
}

export interface Medication {
  id?: string;
  name: string;
  dosage: string;
  schedule: string;
}

export interface Vaccination {
  id?: string;
  name: string;
  date: string;
}

export interface HealthProfile {
  name: string;
  age: number | string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  emergencyContact: {
    name: string;
    phone: string;
  };
  insurance: {
    provider: string;
    memberId: string;
  };
  vitals: {
    weight: number | string; // in kg or lbs
    height: number | string; // in cm or inches
    bloodType: string;
    systolicBP: number | string;
    diastolicBP: number | string;
    restingHeartRate: number | string;
  };
  medicalConditions: MedicalCondition[];
  surgeries: SurgicalHistory[];
  medications: Medication[];
  allergies: string[];
  vaccinations: Vaccination[];
}


