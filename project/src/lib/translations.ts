export type Language = 'en-GB' | 'en-US';

export interface Translations {
  common: {
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    create: string;
    update: string;
    add: string;
    remove: string;
    active: string;
    inactive: string;
    loading: string;
    search: string;
    filter: string;
    sort: string;
    actions: string;
    settings: string;
    logout: string;
    profile: string;
    yes: string;
    no: string;
    optional: string;
  };
  navigation: {
    dashboard: string;
    reviews: string;
    training: string;
    pathways: string;
    strategicRoadmap: string;
    competencyFramework: string;
    copilot: string;
    admin: string;
  };
  admin: {
    title: string;
    users: string;
    jobFamilies: string;
    training: string;
    skills: string;
    competencyFramework: string;
    reviewTemplates: string;
    careerPathways: string;
    careerPlans: string;
    progressionCriteria: string;
    strategicRoadmap: string;
    copilotConfig: string;
    jobHistory: string;
    reports: string;
    languageSettings: string;
    selectLanguage: string;
    languageSaved: string;
    languageError: string;
  };
  competency: {
    title: string;
    description: string;
    newValue: string;
    editValue: string;
    valueTitle: string;
    valueStatement: string;
    sortOrder: string;
    addCompetency: string;
    newCompetency: string;
    editCompetency: string;
    competencyTitle: string;
    competencyDescription: string;
    proficiencyLevels: string;
    addLevel: string;
    newLevel: string;
    editLevel: string;
    levelNumber: string;
    levelName: string;
    levelStatement: string;
    noCompetencies: string;
    noLevels: string;
    selectValue: string;
    emoji: string;
    competenciesCount: string;
    levelsDefined: string;
    deleteValueConfirm: string;
    deleteCompetencyConfirm: string;
    deleteLevelConfirm: string;
  };
  reviews: {
    title: string;
    myReviews: string;
    teamReviews: string;
    pending: string;
    completed: string;
    overdue: string;
    dueDate: string;
    status: string;
    reviewer: string;
    reviewee: string;
    type: string;
    viewReview: string;
    startReview: string;
    noReviews: string;
  };
  training: {
    title: string;
    myTraining: string;
    allTraining: string;
    progress: string;
    notStarted: string;
    inProgress: string;
    completed: string;
    duration: string;
    category: string;
    enrol: string;
    continue: string;
    viewDetails: string;
  };
  pathways: {
    title: string;
    careerPathways: string;
    myProgress: string;
    explore: string;
    currentRole: string;
    nextSteps: string;
    skills: string;
    training: string;
    viewPathway: string;
  };
}

export const translations: Record<Language, Translations> = {
  'en-GB': {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      create: 'Create',
      update: 'Update',
      add: 'Add',
      remove: 'Remove',
      active: 'Active',
      inactive: 'Inactive',
      loading: 'Loading...',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      actions: 'Actions',
      settings: 'Settings',
      logout: 'Logout',
      profile: 'Profile',
      yes: 'Yes',
      no: 'No',
      optional: 'optional',
    },
    navigation: {
      dashboard: 'Dashboard',
      reviews: 'Reviews',
      training: 'Training',
      pathways: 'Career Pathways',
      strategicRoadmap: 'Business Strategy',
      competencyFramework: 'Competency Framework',
      copilot: 'Copilot',
      admin: 'Admin',
    },
    admin: {
      title: 'Admin Panel',
      users: 'Users',
      jobFamilies: 'Job Families',
      training: 'Training',
      skills: 'Skills',
      competencyFramework: 'Competency Framework',
      reviewTemplates: 'Review Templates',
      careerPathways: 'Career Pathways',
      careerPlans: 'Career Plans',
      progressionCriteria: 'Progression Criteria',
      strategicRoadmap: 'Business Strategy',
      copilotConfig: 'Copilot Configuration',
      jobHistory: 'Job History',
      reports: 'Reports',
      languageSettings: 'Language Settings',
      selectLanguage: 'Select Language',
      languageSaved: 'Language preference saved successfully',
      languageError: 'Failed to save language preference',
    },
    competency: {
      title: 'Competency Framework',
      description: 'Manage organisational values, competencies, and Target Behaviour Levels',
      newValue: 'New Value',
      editValue: 'Edit Value',
      valueTitle: 'Value Title',
      valueStatement: 'Value Statement',
      sortOrder: 'Sort Order',
      addCompetency: 'Add Competency',
      newCompetency: 'New Competency',
      editCompetency: 'Edit Competency',
      competencyTitle: 'Competency Title',
      competencyDescription: 'Description',
      proficiencyLevels: 'Target Behaviour Levels',
      addLevel: 'Add Level',
      newLevel: 'New Target Behaviour Level',
      editLevel: 'Edit Target Behaviour Level',
      levelNumber: 'Level Number',
      levelName: 'Level Name',
      levelStatement: 'Level Statement',
      noCompetencies: 'No competencies yet. Add a competency to get started.',
      noLevels: 'No levels defined. Add levels to describe target behaviour progression.',
      selectValue: 'Select a value to view and manage competencies',
      emoji: 'Emoji',
      competenciesCount: 'competencies',
      levelsDefined: 'levels defined',
      deleteValueConfirm: 'Are you sure? This will delete all related competencies and levels.',
      deleteCompetencyConfirm: 'Are you sure? This will delete all related levels.',
      deleteLevelConfirm: 'Are you sure you want to delete this level?',
    },
    reviews: {
      title: 'Reviews',
      myReviews: 'My Reviews',
      teamReviews: 'Team Reviews',
      pending: 'Pending',
      completed: 'Completed',
      overdue: 'Overdue',
      dueDate: 'Due Date',
      status: 'Status',
      reviewer: 'Reviewer',
      reviewee: 'Reviewee',
      type: 'Type',
      viewReview: 'View Review',
      startReview: 'Start Review',
      noReviews: 'No reviews available',
    },
    training: {
      title: 'Training',
      myTraining: 'My Training',
      allTraining: 'All Training',
      progress: 'Progress',
      notStarted: 'Not Started',
      inProgress: 'In Progress',
      completed: 'Completed',
      duration: 'Duration',
      category: 'Category',
      enrol: 'Enrol',
      continue: 'Continue',
      viewDetails: 'View Details',
    },
    pathways: {
      title: 'Career Pathways',
      careerPathways: 'Career Pathways',
      myProgress: 'My Progress',
      explore: 'Explore',
      currentRole: 'Current Role',
      nextSteps: 'Next Steps',
      skills: 'Skills',
      training: 'Training',
      viewPathway: 'View Pathway',
    },
  },
  'en-US': {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      create: 'Create',
      update: 'Update',
      add: 'Add',
      remove: 'Remove',
      active: 'Active',
      inactive: 'Inactive',
      loading: 'Loading...',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      actions: 'Actions',
      settings: 'Settings',
      logout: 'Logout',
      profile: 'Profile',
      yes: 'Yes',
      no: 'No',
      optional: 'optional',
    },
    navigation: {
      dashboard: 'Dashboard',
      reviews: 'Reviews',
      training: 'Training',
      pathways: 'Career Pathways',
      strategicRoadmap: 'Business Strategy',
      competencyFramework: 'Competency Framework',
      copilot: 'Copilot',
      admin: 'Admin',
    },
    admin: {
      title: 'Admin Panel',
      users: 'Users',
      jobFamilies: 'Job Families',
      training: 'Training',
      skills: 'Skills',
      competencyFramework: 'Competency Framework',
      reviewTemplates: 'Review Templates',
      careerPathways: 'Career Pathways',
      careerPlans: 'Career Plans',
      progressionCriteria: 'Progression Criteria',
      strategicRoadmap: 'Business Strategy',
      copilotConfig: 'Copilot Configuration',
      jobHistory: 'Job History',
      reports: 'Reports',
      languageSettings: 'Language Settings',
      selectLanguage: 'Select Language',
      languageSaved: 'Language preference saved successfully',
      languageError: 'Failed to save language preference',
    },
    competency: {
      title: 'Competency Framework',
      description: 'Manage organizational values, competencies, and Target Behavior Levels',
      newValue: 'New Value',
      editValue: 'Edit Value',
      valueTitle: 'Value Title',
      valueStatement: 'Value Statement',
      sortOrder: 'Sort Order',
      addCompetency: 'Add Competency',
      newCompetency: 'New Competency',
      editCompetency: 'Edit Competency',
      competencyTitle: 'Competency Title',
      competencyDescription: 'Description',
      proficiencyLevels: 'Target Behavior Levels',
      addLevel: 'Add Level',
      newLevel: 'New Target Behavior Level',
      editLevel: 'Edit Target Behavior Level',
      levelNumber: 'Level Number',
      levelName: 'Level Name',
      levelStatement: 'Level Statement',
      noCompetencies: 'No competencies yet. Add a competency to get started.',
      noLevels: 'No levels defined. Add levels to describe target behavior progression.',
      selectValue: 'Select a value to view and manage competencies',
      emoji: 'Emoji',
      competenciesCount: 'competencies',
      levelsDefined: 'levels defined',
      deleteValueConfirm: 'Are you sure? This will delete all related competencies and levels.',
      deleteCompetencyConfirm: 'Are you sure? This will delete all related levels.',
      deleteLevelConfirm: 'Are you sure you want to delete this level?',
    },
    reviews: {
      title: 'Reviews',
      myReviews: 'My Reviews',
      teamReviews: 'Team Reviews',
      pending: 'Pending',
      completed: 'Completed',
      overdue: 'Overdue',
      dueDate: 'Due Date',
      status: 'Status',
      reviewer: 'Reviewer',
      reviewee: 'Reviewee',
      type: 'Type',
      viewReview: 'View Review',
      startReview: 'Start Review',
      noReviews: 'No reviews available',
    },
    training: {
      title: 'Training',
      myTraining: 'My Training',
      allTraining: 'All Training',
      progress: 'Progress',
      notStarted: 'Not Started',
      inProgress: 'In Progress',
      completed: 'Completed',
      duration: 'Duration',
      category: 'Category',
      enrol: 'Enroll',
      continue: 'Continue',
      viewDetails: 'View Details',
    },
    pathways: {
      title: 'Career Pathways',
      careerPathways: 'Career Pathways',
      myProgress: 'My Progress',
      explore: 'Explore',
      currentRole: 'Current Role',
      nextSteps: 'Next Steps',
      skills: 'Skills',
      training: 'Training',
      viewPathway: 'View Pathway',
    },
  },
};
