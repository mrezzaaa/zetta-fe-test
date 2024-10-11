interface StudentCompanyDate {
  date: string;
  time: string;
}

interface ContractClosedDate {
  date: string;
  time: string;
}

interface FinalTranscript {
  final_transcript_status:
    | 'transcript_not_send'
    | 'transcript_sent'
    | 'student_retake_pass'
    | 'school_board_pass'
    | 'school_board_fail'
    | 'school_board_eliminated'
    | 'school_board_retake'
    | 'student_refuse_retake'
    | 'student_accept_retake'
    | 'student_retake_fail';
  certification_status: 'pass' | 'failed' | 'eliminated' | 'initial';
}

interface User {
  _id: string;
  first_name: string;
  last_name: string;
  civility: string;
  user_status: 'incorrect_email' | 'pending' | 'active';
  email: string;
}

interface JobDescription {
  _id: string;
  job_description_status:
    | 'initial'
    | 'sent_to_student'
    | 'sent_to_mentor'
    | 'sent_to_school'
    | 'rejected_by_acad_dir'
    | 'validated_by_mentor'
    | 'validated_by_acad_staff'
    | 'expedite_by_acad_staff'
    | 'expedite_by_acad_staff_student';
  status: 'active' | 'deleted';
  class_id: {
    _id: string;
  };
}

interface Problematic {
  _id: string;
  problematic_status:
    | 'sent_to_student'
    | 'sent_to_acadDpt'
    | 'rejected_by_acadDpt'
    | 'validated_by_acadDpt'
    | 'sent_to_certifier'
    | 'rejected_by_certifier'
    | 'validated_by_certifier'
    | 'resubmitted_to_certifier'
    | 'resubmitted_to_acadDpt';
  status: 'active' | 'deleted';
}

interface MentorEvaluationResponse {
  _id: string;
  mentor_evaluation_status: 'initial' | 'sent_to_mentor' | 'filled_by_mentor' | 'validated_by_acad_staff' | 'expedited_by_acad_staff';
  status: 'active' | 'deleted';
}

interface CompanyType {
  _id: string;
  company_name: string;
}

interface Company {
  category_insertion:
    | 'FORMATION_INITIALE'
    | 'CONTRAT_DAPPRENTISSAGE'
    | 'CONTRAT_DE_PROFESSIONNALISATION'
    | 'STATUT_DE_STAGIAIRE_DE_LA_FORMATION_PROFESSIONNELLE';
  type_of_formation:
    | 'FORMATION_INITIALE_HORS_APPRENTISSAGE'
    | 'FORMATION_INITIALE_APPRENTISSAGE'
    | 'FORMATION_CONTINUE_HORS_CONTRAT_DE_PROFESSIONNALISATION'
    | 'FORMATION_CONTINUE_CONTRAT_DE_PROFESSIONNALISATION'
    | 'VAE'
    | 'EQUIVALENCE_DIPLOME_ETRANGER'
    | 'CANDIDAT_LIBRE';
  company: CompanyType;
  start_date: StudentCompanyDate;
  end_date: StudentCompanyDate;
  contract_closed_date: ContractClosedDate;
  reason_deactivating_contract: string;
  status: 'pending' | 'active' | 'inactive' | 'deleted';
  is_active: boolean;
  mentor: User;
  job_description_id: JobDescription;
  problematic_id: Problematic;
  mentor_evaluation_id: MentorEvaluationResponse;
}

interface Test {
  _id: string;
  send_date_to_mentor: {
    date_utc: string;
    time_utc: string;
  };
}

interface StudentAutoProEval {
  status: 'not_sent' | 'sent' | 'opened' | 'resend' | 'submitted';
  test_id: Test;
}

export interface GetStudentsCompanyData {
  _id: string;
  certificate_issuance_status:
    | 'sent_to_student'
    | 'details_confirmed'
    | 'details_need_revision'
    | 'certificate_issued'
    | 'details_revision_done';
  identity_verification_status: 'not_sent' | 'sent_to_student' | 'details_confirmed' | 'due_date_passed';
  final_transcript_id: FinalTranscript;
  companies: Company[];
  job_description_id: JobDescription;
  problematic_id: Problematic;
  mentor_evaluation_id: MentorEvaluationResponse;
  retake_tests: { _id: string }[];
  soft_skill_pro_evaluation: StudentAutoProEval;
  academic_pro_evaluation: StudentAutoProEval;
}

export interface GetStudentsCompanyDataResponse {
  GetOneStudent: GetStudentsCompanyData;
}
