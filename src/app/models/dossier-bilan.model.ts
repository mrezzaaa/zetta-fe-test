export interface BlockOfCompetenceCondition {
  _id: string;
  block_of_competence_condition: string;
  transversal_block: boolean;
  is_retake_by_block: boolean;
  dossier_bilan_competence: DossierBilanCompetenceInput[];
  isExpanded?: boolean;
}

export interface BlockOfCompetenceConditionInput {
  _id: string;
  dossier_bilan_competence: DossierBilanCompetenceInput[];
}

export interface DossierBilanCompetenceInput {
  competency_ref: string;
  competency_name: string;
  competency_short_name: string;
  competency_description: string;
}

export interface DossierBilanInput {
  name?: string;
  certifier_id?: string;
  rncp_title_id?: string;
  class_id?: string;

  blocks_for_dossier_bilan?: {
    block_id: string;
    is_selected: boolean;
  }
  schools?: {
    school_id: string;
    is_selected: boolean;
  }[]
  student_required_cv: boolean;
  student_required_upload_presentation_schedule: string;
  student_required_upload_presentation: boolean;
  student_required_job_description: boolean;
}

export interface DossierBilan {
  _id: string;
  name: string;
  certifier_id: {
    _id: string;
    short_name: string;
  };
  rncp_title_id: {
    _id: string;
    short_name: string;
  };
  class_id: {
    _id: string;
    name: string;
  };
  dossier_bilan_status: DossierBilanStatus;
  count_document: number;
}

export interface PaginationInput {
  page: number;
  limit: number;
}

export interface DossierBilanSorting {
  name: Sorting;
  class_id: Sorting;
  certifier_id: Sorting;
  rncp_title_id: Sorting;
  dossier_bilan_status: Sorting;
}

export interface DossierBilanFilter {
  name: string;
  class_id: string;
  certifier_id: string;
  rncp_title_id: string;
  dossier_bilan_status: Sorting;
}

export interface DossierBilanParameter {
  _id: string;
  name: string;
  schools: {
    school_id: {
      _id: string;
      short_name: string;
    };
    is_selected: boolean;
  }[];
  certifier_id: {
    _id: string;
    short_name: string;
  };
  rncp_title_id: {
    _id: string;
    short_name: string;
  };
  class_id: {
    _id: string;
    name: string;
    is_job_desc_active: boolean;
  };
  student_required_cv: boolean;
  student_required_upload_passport_schedule: string;
  student_required_upload_passport: boolean;
  student_required_job_description: boolean;
  blocks_for_dossier_bilan: {
    is_selected: boolean;
    block_id: {
      _id: string;
      block_of_competence_condition: string;
      transversal_block: boolean;
      is_retake_by_block: boolean;
      dossier_bilan_competence?: DossierBilanCompetenceInput[];
      subjects?: Subjects[];
    };
  }[];
  dossier_bilan_status: DossierBilanStatus | string;
}

export interface Subjects {
  _id: string;
  subject_name: string;
  evaluations: {
    _id: string;
    evaluation: string;
  }[]
}

export interface DossierBilanFollowUp {
  _id: string;
  status: string;
  student_id: {
    _id: string;
    first_name: string;
    last_name: string;
    civility: EnumCivility | string;
  };
  school_id: {
    _id: string;
    short_name: string;
  };
  job_description_id: {
    _id: string;
    job_description_status: string;
  }
  student_dossier_bilan_cv: {
    _id: string;
  }
  student_dossier_bilan_passport: {
    _id: string;
  }
  dossier_bilan_pdf_s3_file_name: string;
  is_published: boolean;
  dossier_bilan_publish_to_student: {
    date: string;
    time: string;
    status: string;
  };
  block_competence_conditions: {
    evaluation_id: {
      _id: string;
    }
    block_competence_id: {
      _id: string;
    }
    test_id: {
      _id: string;
      correction_status: string;
      correction_status_for_schools: {
        correction_status: string;
        school: {
          _id: string;
          short_name: string;
        }
      }[]
    }
  }[],
  count_document: number;
}

export interface DossierBilanFollowUpFilter {
  dossier_bilan_id: string;
  full_name: string;
  school: string;
  student_cv: DossierBilanStudentDocumentStatus[];
  student_passport: DossierBilanStudentDocumentStatus[];
  job_description: DossierBilanStudentDocumentStatus[];
  block_competence_conditions: {
    block_id: string;
    block_status: DossierBilanFollowUpBlockCompetenceConditionFilterEnum[];
  };
  publish_date: string;
  offset: number;
}

export interface DossierBilanFollowUpSorting {
  full_name?: string;
  school?: string;
  student_cv?: string;
  job_description?: string;
  student_passport?: string;
  block_competence_conditions?: {
    block_id: string;
    block_status: string;
  };
  publish_date?: string;
}

enum DossierBilanStatus {
  setup_parameter,
  in_progress,
  finish,
}

enum DossierBilanStudentDocumentStatus {
  done,
  not_done
}

enum DossierBilanFollowUpBlockCompetenceConditionFilterEnum {
  evaluated,
  not_evaluated,
  all,
}

enum Sorting {
  asc,
  desc,
}

enum EnumCivility {
  MR,
  MRS
}
